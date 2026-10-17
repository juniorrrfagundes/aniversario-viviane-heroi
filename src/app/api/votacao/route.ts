import type { NextRequest } from "next/server";
import {
  lerFases,
  meusVotos,
  participantesParaVotar,
  votar,
} from "@/lib/concurso";
import { dispositivoDa } from "@/lib/dispositivo";
import { comTratamento } from "@/lib/erros";
import { CATEGORIAS, ehCategoria } from "@/lib/tipos";

// Participantes e votos já dados por este celular. Nunca devolve contagem de
// votos: o resultado só aparece no painel do admin.
export const GET = comTratamento(async (req: NextRequest) => {
  const dispositivo = dispositivoDa(req);
  const [fases, votos] = await Promise.all([
    lerFases(),
    meusVotos(dispositivo.id),
  ]);
  const participantes = fases.votacao
    ? await participantesParaVotar(dispositivo.id)
    : Object.fromEntries(CATEGORIAS.map((c) => [c, []]));

  return dispositivo.responder({
    votacaoAberta: fases.votacao,
    participantes,
    meusVotos: votos,
  });
});

export const POST = comTratamento(async (req: NextRequest) => {
  const dispositivo = dispositivoDa(req);
  const corpo = await req.json().catch(() => null);
  const categoria = corpo?.categoria;
  const participanteId = corpo?.participanteId;

  if (!ehCategoria(categoria) || typeof participanteId !== "string") {
    return dispositivo.responder({ erro: "Voto inválido." }, 422);
  }
  if (!(await lerFases()).votacao) {
    return dispositivo.responder({ erro: "A votação está fechada." }, 403);
  }

  const resultado = await votar(dispositivo.id, categoria, participanteId);
  switch (resultado.status) {
    case "ok":
      return dispositivo.responder({ participante: resultado.participante }, 201);
    case "ja-votou":
      return dispositivo.responder(
        {
          erro: "Este celular já votou nesta categoria.",
          participante: resultado.participante,
        },
        409,
      );
    case "nao-encontrado":
      return dispositivo.responder(
        { erro: "Participante não encontrado. Atualize a página." },
        404,
      );
  }
});
