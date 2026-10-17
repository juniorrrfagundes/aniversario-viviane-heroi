import { NextResponse, type NextRequest } from "next/server";
import { adminLogado, naoAutorizado } from "@/lib/admin";
import { excluirParticipante } from "@/lib/concurso";

export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/admin/participantes/[id]">,
) {
  if (!adminLogado(req)) return naoAutorizado();
  const { id } = await ctx.params;
  if (!(await excluirParticipante(id))) {
    return NextResponse.json({ erro: "Cadastro não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
