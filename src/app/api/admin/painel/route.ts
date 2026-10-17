import { NextResponse, type NextRequest } from "next/server";
import { adminLogado, naoAutorizado } from "@/lib/admin";
import { lerFases, placar } from "@/lib/concurso";

// Tudo o que o painel, o telão e a página de QR codes precisam.
export async function GET(req: NextRequest) {
  if (!adminLogado(req)) return naoAutorizado();
  const [fases, resultado] = await Promise.all([lerFases(), placar()]);
  return NextResponse.json({ fases, placar: resultado });
}
