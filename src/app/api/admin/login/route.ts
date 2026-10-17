import type { NextRequest } from "next/server";
import { entrar, sair } from "@/lib/admin";

export async function POST(req: NextRequest) {
  const corpo = await req.json().catch(() => null);
  return entrar(req, corpo?.senha);
}

export async function DELETE() {
  return sair();
}
