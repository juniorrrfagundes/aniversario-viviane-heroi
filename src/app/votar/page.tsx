"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useState } from "react";
import {
  Aviso,
  Carregando,
  CartaoParticipante,
  ErroComBotao,
  Tela,
} from "@/components/ui";
import { chamarApi, ERRO_CONEXAO } from "@/lib/api";
import {
  CATEGORIAS,
  ROTULOS,
  type Categoria,
  type Participante,
  type PorCategoria,
} from "@/lib/tipos";
import { useDados } from "@/lib/useDados";

type Situacao = {
  votacaoAberta: boolean;
  participantes: PorCategoria<Participante[]>;
  meusVotos: PorCategoria<Participante | null>;
};

export default function Votar() {
  const { dados, erro, recarregar } = useDados<Situacao>("/api/votacao");
  const [aba, setAba] = useState<Categoria | null>(null);
  // Votos feitos nesta visita (aparecem na hora, antes de recarregar).
  const [votosAgora, setVotosAgora] = useState<
    Partial<PorCategoria<Participante>>
  >({});

  if (!dados) {
    return (
      <Tela emoji="🗳️" titulo="Votação">
        {erro ? (
          <ErroComBotao mensagem={erro} tentarDeNovo={recarregar} />
        ) : (
          <Carregando />
        )}
      </Tela>
    );
  }

  const votoEm = (c: Categoria) => votosAgora[c] ?? dados.meusVotos[c];

  if (!dados.votacaoAberta) {
    const jaVotados = CATEGORIAS.flatMap((c) => votoEm(c) ?? []);
    return (
      <Tela emoji="🗳️" titulo="Votação">
        <Aviso emoji="⏳" titulo="A votação está fechada">
          Ela abre no fim da festa. Quando for anunciada, toque em “Atualizar”.
        </Aviso>
        <button type="button" onClick={recarregar} className="botao">
          🔄 Atualizar
        </button>
        {jaVotados.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-center text-lg font-semibold">✅ Seus votos</h2>
            {jaVotados.map((p) => (
              <CartaoParticipante key={p.id} participante={p} />
            ))}
          </section>
        )}
      </Tela>
    );
  }

  // Abre na primeira categoria em que ainda não votou.
  const abaAtual = aba ?? CATEGORIAS.find((c) => !votoEm(c)) ?? CATEGORIAS[0];
  const outraSemVoto = CATEGORIAS.find((c) => c !== abaAtual && !votoEm(c));
  const voto = votoEm(abaAtual);

  return (
    <Tela emoji="🗳️" titulo="Votação">
      <p className="-mt-2 text-center text-white/85">
        Escolha a melhor fantasia de cada categoria. Só dá para votar uma vez!
      </p>

      <div role="tablist" className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === abaAtual}
            onClick={() => setAba(c)}
            className={`rounded-xl px-3 py-2.5 text-lg font-semibold transition ${
              c === abaAtual ? "bg-white text-tinta shadow" : "text-white/85"
            }`}
          >
            {ROTULOS[c].emoji} {ROTULOS[c].plural}
            {votoEm(c) && " ✓"}
          </button>
        ))}
      </div>

      {voto ? (
        <section className="space-y-4">
          <Aviso emoji="✅" titulo="Voto registrado!">
            Obrigado! O resultado será revelado no telão. 🎉
          </Aviso>
          <p className="text-center font-semibold text-white/90">Você votou em:</p>
          <CartaoParticipante participante={voto} />
          {outraSemVoto && (
            <button
              type="button"
              className="botao"
              onClick={() => setAba(outraSemVoto)}
            >
              Votar agora em {ROTULOS[outraSemVoto].plural}{" "}
              {ROTULOS[outraSemVoto].emoji}
            </button>
          )}
        </section>
      ) : (
        <ListaParaVotar
          key={abaAtual}
          categoria={abaAtual}
          participantes={dados.participantes[abaAtual]}
          aoVotar={(p) => {
            setAba(abaAtual); // fica nesta aba para mostrar a confirmação
            setVotosAgora((v) => ({ ...v, [abaAtual]: p }));
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } });
          }}
          aoMudarSituacao={recarregar}
        />
      )}

      <Link href="/" className="mt-auto pt-4 text-center text-white/70 underline">
        Voltar ao início
      </Link>
    </Tela>
  );
}

function ListaParaVotar({
  categoria,
  participantes,
  aoVotar,
  aoMudarSituacao,
}: {
  categoria: Categoria;
  participantes: Participante[];
  aoVotar: (p: Participante) => void;
  aoMudarSituacao: () => void;
}) {
  const [escolhido, setEscolhido] = useState<Participante | null>(null);
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (participantes.length === 0) {
    return (
      <Aviso emoji="🤷" titulo="Ninguém por aqui">
        Ainda não há participantes na categoria {ROTULOS[categoria].plural}.
      </Aviso>
    );
  }

  const termo = normalizar(busca.trim());
  const visiveis = termo
    ? participantes.filter((p) => normalizar(`${p.nome} ${p.fantasia}`).includes(termo))
    : participantes;

  async function confirmar() {
    if (!escolhido) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await chamarApi<{ participante?: Participante; erro?: string }>(
        "/api/votacao",
        { metodo: "POST", corpo: { categoria, participanteId: escolhido.id } },
      );
      if (r.ok && r.dados.participante) {
        aoVotar(r.dados.participante);
        return;
      }
      setErro(r.dados.erro ?? "Não foi possível votar. Tente de novo.");
      // Já votou, votação fechou ou participante excluído: atualiza a tela.
      if ([403, 404, 409].includes(r.status)) aoMudarSituacao();
    } catch {
      setErro(ERRO_CONEXAO);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="space-y-3 pb-28">
      {participantes.length > 6 && (
        <input
          className="campo"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar por nome ou fantasia"
        />
      )}

      {visiveis.map((p) => {
        const marcado = escolhido?.id === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setEscolhido(p)}
            aria-pressed={marcado}
            className={`cartao flex w-full items-center gap-4 text-left transition ${
              marcado ? "ring-4 ring-amarelo" : ""
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold break-words">{p.nome}</p>
              <p className="break-words text-tinta/70">🎭 {p.fantasia}</p>
            </div>
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-lg ${
                marcado ? "border-roxo bg-roxo text-white" : "border-violet-200"
              }`}
            >
              {marcado && "✓"}
            </span>
          </button>
        );
      })}
      {visiveis.length === 0 && (
        <p className="text-center text-white/80">Ninguém encontrado com “{busca}”.</p>
      )}

      {/* Barra fixa no rodapé com o botão de confirmar */}
      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/50 to-transparent px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md space-y-2">
          {erro && (
            <p className="rounded-xl bg-rose-100 px-3 py-2 text-rose-800">{erro}</p>
          )}
          <button
            type="button"
            className="botao"
            disabled={!escolhido || enviando}
            onClick={confirmar}
          >
            {enviando
              ? "Enviando…"
              : escolhido
                ? `Votar em ${escolhido.nome} ✅`
                : "Toque em uma fantasia"}
          </button>
        </div>
      </div>
    </section>
  );
}

// Ignora maiúsculas e acentos na busca ("joao" encontra "João").
function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
