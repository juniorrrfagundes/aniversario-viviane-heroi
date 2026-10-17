/**
 * Chamadas à API feitas pelas telas (navegador).
 *
 * Manda junto a cópia do identificador do celular guardada no navegador e
 * atualiza essa cópia com o que o servidor devolver (ver lib/dispositivo.ts).
 */

const CHAVE_LOCAL = "concurso-fantasias:dispositivo";

function lerLocal(): string | null {
  try {
    return localStorage.getItem(CHAVE_LOCAL);
  } catch {
    return null; // navegação anônima em alguns celulares bloqueia o localStorage
  }
}

function salvarLocal(id: string) {
  try {
    localStorage.setItem(CHAVE_LOCAL, id);
  } catch {}
}

export type RespostaApi<T> = { ok: boolean; status: number; dados: T };

/** Lança erro só quando não há conexão; erros da API vêm em `ok: false`. */
export async function chamarApi<T>(
  url: string,
  opcoes: { metodo?: string; corpo?: unknown } = {},
): Promise<RespostaApi<T>> {
  const cabecalhos: Record<string, string> = {};
  const local = lerLocal();
  if (local) cabecalhos["x-dispositivo"] = local;
  if (opcoes.corpo !== undefined) cabecalhos["content-type"] = "application/json";

  const res = await fetch(url, {
    method: opcoes.metodo ?? "GET",
    headers: cabecalhos,
    body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
    cache: "no-store",
  });

  const id = res.headers.get("x-dispositivo");
  if (id) salvarLocal(id);

  const dados = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, dados };
}

export const ERRO_CONEXAO =
  "Sem conexão com o servidor. Confira a internet e tente de novo.";
