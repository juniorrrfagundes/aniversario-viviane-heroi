import type { NextRequest } from "next/server";
import { cadastrar, lerFases, meusCadastros } from "@/lib/concurso";
import { dispositivoDa } from "@/lib/dispositivo";
import { ehCategoria, FANTASIA_MAX, NOME_MAX } from "@/lib/tipos";

// Situação do cadastro para este celular.
export async function GET(req: NextRequest) {
  const dispositivo = dispositivoDa(req);
  const [fases, meus] = await Promise.all([
    lerFases(),
    meusCadastros(dispositivo.id),
  ]);
  return dispositivo.responder({ cadastroAberto: fases.cadastro, meus });
}

export async function POST(req: NextRequest) {
  const dispositivo = dispositivoDa(req);
  const corpo = await req.json().catch(() => null);

  const categoria = corpo?.categoria;
  const nome = typeof corpo?.nome === "string" ? corpo.nome.trim() : "";
  const fantasia =
    typeof corpo?.fantasia === "string" ? corpo.fantasia.trim() : "";

  if (!ehCategoria(categoria)) {
    return dispositivo.responder({ erro: "Escolha Adulto ou Criança." }, 422);
  }
  if (!nome || nome.length > NOME_MAX) {
    return dispositivo.responder(
      { erro: `Informe o nome (até ${NOME_MAX} letras).` },
      422,
    );
  }
  if (!fantasia || fantasia.length > FANTASIA_MAX) {
    return dispositivo.responder(
      { erro: `Informe a fantasia (até ${FANTASIA_MAX} letras).` },
      422,
    );
  }

  if (!(await lerFases()).cadastro) {
    return dispositivo.responder({ erro: "O cadastro está encerrado." }, 403);
  }

  const { jaExistia, participante } = await cadastrar(dispositivo.id, {
    categoria,
    nome,
    fantasia,
  });
  if (jaExistia) {
    return dispositivo.responder(
      { erro: "Este celular já fez um cadastro nesta categoria.", participante },
      409,
    );
  }
  return dispositivo.responder({ participante }, 201);
}
