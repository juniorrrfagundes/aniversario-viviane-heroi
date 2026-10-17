import { createHash } from "node:crypto";
import { armazem } from "./armazem";
import {
  CATEGORIAS,
  type Categoria,
  type Participante,
  type PorCategoria,
} from "./tipos";

/**
 * Regras do concurso (roda só no servidor).
 *
 * Como os dados ficam no Redis:
 *   fases               cadastro → "sim"/"nao", votacao → "sim"/"nao"
 *   participantes       id → participante (JSON)
 *   cadastros:<cat>     dispositivo → id do participante  (1 por celular)
 *   votos:<cat>         dispositivo → id do participante  (1 voto por celular)
 *
 * O "1 por celular" é garantido pelo HSETNX, que só grava se o celular ainda
 * não tiver um valor naquela categoria — mesmo com dois toques seguidos.
 */

type ParticipanteSalvo = Participante & {
  dispositivo: string;
  criadoEm: string;
};

const CHAVES = {
  fases: "fases",
  participantes: "participantes",
  cadastros: (c: Categoria) => `cadastros:${c}`,
  votos: (c: Categoria) => `votos:${c}`,
};

function publico(p: ParticipanteSalvo): Participante {
  return { id: p.id, categoria: p.categoria, nome: p.nome, fantasia: p.fantasia };
}

function lerParticipante(valor: unknown): ParticipanteSalvo | null {
  if (typeof valor === "string") {
    try {
      valor = JSON.parse(valor);
    } catch {
      return null;
    }
  }
  return valor && typeof valor === "object" ? (valor as ParticipanteSalvo) : null;
}

async function buscarParticipante(id: unknown) {
  if (typeof id !== "string") return null;
  return lerParticipante(await armazem().hget(CHAVES.participantes, id));
}

async function todosParticipantes(): Promise<ParticipanteSalvo[]> {
  const tudo = await armazem().hgetall(CHAVES.participantes);
  return Object.values(tudo)
    .map(lerParticipante)
    .filter((p): p is ParticipanteSalvo => p !== null)
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
}

async function porCategoria<T>(
  fn: (c: Categoria) => Promise<T>,
): Promise<PorCategoria<T>> {
  const valores = await Promise.all(CATEGORIAS.map(fn));
  return Object.fromEntries(
    CATEGORIAS.map((c, i) => [c, valores[i]]),
  ) as PorCategoria<T>;
}

// ---------------------------------------------------------------- Fases

export type Fases = { cadastro: boolean; votacao: boolean };

export async function lerFases(): Promise<Fases> {
  const f = await armazem().hgetall(CHAVES.fases);
  return {
    // Sem nada salvo ainda: cadastro aberto e votação fechada.
    cadastro: (f.cadastro ?? "sim") === "sim",
    votacao: f.votacao === "sim",
  };
}

export async function mudarFase(fase: keyof Fases, aberta: boolean) {
  await armazem().hset(CHAVES.fases, fase, aberta ? "sim" : "nao");
}

// ---------------------------------------------------------------- Cadastro

export async function meusCadastros(
  dispositivo: string,
): Promise<PorCategoria<Participante | null>> {
  return porCategoria(async (c) => {
    const id = await armazem().hget(CHAVES.cadastros(c), dispositivo);
    const p = await buscarParticipante(id);
    return p ? publico(p) : null;
  });
}

export async function cadastrar(
  dispositivo: string,
  dados: { categoria: Categoria; nome: string; fantasia: string },
): Promise<{ jaExistia: boolean; participante: Participante }> {
  const a = armazem();
  const chave = CHAVES.cadastros(dados.categoria);
  const id = crypto.randomUUID();

  if (!(await a.hsetnx(chave, dispositivo, id))) {
    const existente = await buscarParticipante(await a.hget(chave, dispositivo));
    if (existente) return { jaExistia: true, participante: publico(existente) };
    // A vaga apontava para um participante que não existe mais: assume ela.
    await a.hset(chave, dispositivo, id);
  }

  const novo: ParticipanteSalvo = {
    id,
    categoria: dados.categoria,
    nome: dados.nome,
    fantasia: dados.fantasia,
    dispositivo,
    criadoEm: new Date().toISOString(),
  };
  await a.hset(CHAVES.participantes, id, JSON.stringify(novo));
  return { jaExistia: false, participante: publico(novo) };
}

// ---------------------------------------------------------------- Votação

/**
 * Participantes para a tela de votação. Cada celular vê uma ordem diferente
 * (mas sempre a mesma para ele), para quem aparece primeiro não levar vantagem.
 */
export async function participantesParaVotar(
  dispositivo: string,
): Promise<PorCategoria<Participante[]>> {
  const ordem = (id: string) =>
    createHash("sha1").update(dispositivo + id).digest("hex");
  const todos = (await todosParticipantes())
    .map((p) => ({ p: publico(p), chave: ordem(p.id) }))
    .sort((a, b) => a.chave.localeCompare(b.chave))
    .map((x) => x.p);
  return porCategoria(async (c) => todos.filter((p) => p.categoria === c));
}

export async function meusVotos(
  dispositivo: string,
): Promise<PorCategoria<Participante | null>> {
  return porCategoria(async (c) => {
    const id = await armazem().hget(CHAVES.votos(c), dispositivo);
    const p = await buscarParticipante(id);
    return p ? publico(p) : null;
  });
}

export type ResultadoVoto =
  | { status: "ok"; participante: Participante }
  | { status: "ja-votou"; participante: Participante }
  | { status: "nao-encontrado" };

export async function votar(
  dispositivo: string,
  categoria: Categoria,
  participanteId: string,
): Promise<ResultadoVoto> {
  const a = armazem();
  const escolhido = await buscarParticipante(participanteId);
  if (!escolhido || escolhido.categoria !== categoria) {
    return { status: "nao-encontrado" };
  }

  const chave = CHAVES.votos(categoria);
  if (!(await a.hsetnx(chave, dispositivo, participanteId))) {
    const anterior = await buscarParticipante(await a.hget(chave, dispositivo));
    if (anterior) return { status: "ja-votou", participante: publico(anterior) };
    // Tinha votado em alguém que foi excluído: o voto antigo não vale mais.
    await a.hset(chave, dispositivo, participanteId);
  }
  return { status: "ok", participante: publico(escolhido) };
}

// ---------------------------------------------------------------- Admin

export type LinhaPlacar = Participante & { votos: number; criadoEm: string };
export type Placar = {
  participantes: LinhaPlacar[]; // do mais votado para o menos votado
  totalVotos: number;
  vencedores: string[]; // ids; mais de um = empate; vazio = sem votos
};

export async function placar(): Promise<PorCategoria<Placar>> {
  const todos = await todosParticipantes();
  return porCategoria(async (c) => {
    const votos = await armazem().hgetall(CHAVES.votos(c));
    const contagem = new Map<string, number>();
    for (const id of Object.values(votos)) {
      if (typeof id === "string") contagem.set(id, (contagem.get(id) ?? 0) + 1);
    }

    const participantes = todos
      .filter((p) => p.categoria === c)
      .map((p) => ({
        ...publico(p),
        criadoEm: p.criadoEm,
        votos: contagem.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.votos - a.votos);

    const maximo = participantes[0]?.votos ?? 0;
    return {
      participantes,
      // Só conta votos em quem ainda existe.
      totalVotos: participantes.reduce((s, p) => s + p.votos, 0),
      vencedores:
        maximo > 0
          ? participantes.filter((p) => p.votos === maximo).map((p) => p.id)
          : [],
    };
  });
}

/**
 * Exclui um cadastro. Os votos que ele recebeu são apagados e quem votou nele
 * pode votar de novo; o celular que o cadastrou pode cadastrar de novo.
 */
export async function excluirParticipante(id: string): Promise<boolean> {
  const a = armazem();
  const p = await buscarParticipante(id);
  if (!p) return false;

  await a.hdel(CHAVES.participantes, id);

  const cadastros = CHAVES.cadastros(p.categoria);
  if ((await a.hget(cadastros, p.dispositivo)) === id) {
    await a.hdel(cadastros, p.dispositivo);
  }

  const votos = await a.hgetall(CHAVES.votos(p.categoria));
  const eleitores = Object.keys(votos).filter((d) => votos[d] === id);
  await a.hdel(CHAVES.votos(p.categoria), ...eleitores);
  return true;
}
