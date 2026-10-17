import { NextResponse, type NextRequest } from "next/server";
import { adminLogado, naoAutorizado } from "@/lib/admin";
import { lerFases, mudarFase } from "@/lib/concurso";

// Abre/fecha o cadastro e a votação. Corpo: { cadastro?: boolean, votacao?: boolean }
export async function PATCH(req: NextRequest) {
  if (!adminLogado(req)) return naoAutorizado();
  const corpo = await req.json().catch(() => null);

  for (const fase of ["cadastro", "votacao"] as const) {
    if (typeof corpo?.[fase] === "boolean") await mudarFase(fase, corpo[fase]);
  }
  return NextResponse.json({ fases: await lerFases() });
}
