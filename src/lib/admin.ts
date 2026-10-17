import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Acesso do administrador: uma senha na variável de ambiente ADMIN_SENHA.
 * Depois do login, o navegador guarda um cookie com uma "impressão digital"
 * da senha (nunca a senha em si). Trocar a senha desconecta todo mundo.
 */

const COOKIE = "admin";

// No seu computador, sem ADMIN_SENHA, a senha é "festa". Na Vercel é obrigatória.
function senhaConfigurada(): string | null {
  return process.env.ADMIN_SENHA || (process.env.VERCEL ? null : "festa");
}

function impressao(senha: string) {
  return createHash("sha256").update(`concurso-fantasias:${senha}`).digest();
}

function iguais(a: Buffer, b: Buffer) {
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminLogado(req: NextRequest): boolean {
  const senha = senhaConfigurada();
  const cookie = req.cookies.get(COOKIE)?.value;
  if (!senha || !cookie) return false;
  return iguais(Buffer.from(cookie, "hex"), impressao(senha));
}

export function entrar(req: NextRequest, tentativa: unknown) {
  const senha = senhaConfigurada();
  if (!senha) {
    return NextResponse.json(
      { erro: "Defina a variável ADMIN_SENHA na Vercel e faça um novo deploy." },
      { status: 503 },
    );
  }
  if (
    typeof tentativa !== "string" ||
    !iguais(impressao(tentativa), impressao(senha))
  ) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, impressao(senha).toString("hex"), {
    httpOnly: true,
    sameSite: "lax",
    secure: req.nextUrl.protocol === "https:",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export function sair() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE);
  return res;
}

export function naoAutorizado() {
  return NextResponse.json({ erro: "Faça login." }, { status: 401 });
}
