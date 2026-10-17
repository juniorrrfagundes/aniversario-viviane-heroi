"use client";

import { useState } from "react";
import { chamarApi, ERRO_CONEXAO } from "@/lib/api";
import type { Fases, Placar } from "@/lib/concurso";
import type { PorCategoria } from "@/lib/tipos";
import { useDados } from "@/lib/useDados";
import { Carregando, ErroComBotao } from "./ui";

export type Painel = { fases: Fases; placar: PorCategoria<Placar> };

/**
 * Dados do painel para as telas do admin (painel, QR codes e telão). Mostra a
 * tela de senha quando não está logado. Com `intervaloMs`, atualiza sozinho.
 */
export function useAdmin(intervaloMs?: number) {
  const r = useDados<Painel>("/api/admin/painel", intervaloMs);

  let bloqueio: React.ReactNode = null;
  if (r.status === 401) {
    bloqueio = <Login aoEntrar={r.recarregar} />;
  } else if (!r.dados) {
    bloqueio = (
      <main className="mx-auto w-full max-w-md px-4 py-10">
        {r.erro ? (
          <ErroComBotao mensagem={r.erro} tentarDeNovo={r.recarregar} />
        ) : (
          <Carregando />
        )}
      </main>
    );
  }
  return { ...r, bloqueio };
}

function Login({ aoEntrar }: { aoEntrar: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await chamarApi<{ erro?: string }>("/api/admin/login", {
        metodo: "POST",
        corpo: { senha },
      });
      if (r.ok) aoEntrar();
      else setErro(r.dados.erro ?? "Não foi possível entrar.");
    } catch {
      setErro(ERRO_CONEXAO);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
      <form onSubmit={entrar} className="cartao space-y-4">
        <p className="text-center text-5xl">🔐</p>
        <h1 className="text-center text-2xl font-semibold">Área do organizador</h1>
        <input
          className="campo"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          autoFocus
        />
        {erro && (
          <p className="rounded-xl bg-rose-100 px-3 py-2 text-rose-800">{erro}</p>
        )}
        <button type="submit" className="botao" disabled={enviando || !senha}>
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
