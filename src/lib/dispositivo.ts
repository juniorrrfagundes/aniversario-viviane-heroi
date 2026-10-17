import { NextResponse, type NextRequest } from "next/server";

/**
 * Identificador do celular (servidor).
 *
 * Fica em dois lugares: num cookie que o servidor cria (o JavaScript da
 * página não consegue apagar) e numa cópia no navegador (localStorage), que a
 * página manda no cabeçalho x-dispositivo. Se um dos dois sumir, o outro
 * restaura. Não é à prova de fraude (aba anônima gera outro), mas basta para
 * uma festa entre amigos.
 */

const COOKIE = "dispositivo";
export const CABECALHO = "x-dispositivo";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function dispositivoDa(req: NextRequest) {
  const doCookie = req.cookies.get(COOKIE)?.value;
  const doNavegador = req.headers.get(CABECALHO);
  const id =
    doCookie && UUID.test(doCookie)
      ? doCookie
      : doNavegador && UUID.test(doNavegador)
        ? doNavegador
        : crypto.randomUUID();

  return {
    id,
    /** Responde em JSON e renova o cookie e a cópia do navegador. */
    responder(corpo: unknown, status = 200) {
      const res = NextResponse.json(corpo, { status });
      res.cookies.set(COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
      res.headers.set(CABECALHO, id);
      return res;
    },
  };
}
