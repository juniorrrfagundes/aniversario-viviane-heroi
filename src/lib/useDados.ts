"use client";

import { useCallback, useEffect, useState } from "react";
import { chamarApi, ERRO_CONEXAO } from "./api";

/**
 * Busca dados de uma rota GET da API. Com `intervaloMs`, busca de novo
 * periodicamente (usado no painel do admin para atualizar os votos).
 */
export function useDados<T>(url: string, intervaloMs?: number) {
  const [dados, setDados] = useState<T | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    let ativo = true;
    const buscar = () =>
      chamarApi<T>(url)
        .then((r) => {
          if (!ativo) return;
          setStatus(r.status);
          if (r.ok) {
            setDados(r.dados);
            setErro(null);
          } else {
            const { erro } = (r.dados ?? {}) as { erro?: string };
            setErro(erro ?? "Algo deu errado. Tente de novo.");
          }
        })
        .catch(() => ativo && setErro(ERRO_CONEXAO));

    buscar();
    const timer = intervaloMs ? setInterval(buscar, intervaloMs) : undefined;
    return () => {
      ativo = false;
      clearInterval(timer);
    };
  }, [url, intervaloMs, versao]);

  const recarregar = useCallback(() => setVersao((v) => v + 1), []);
  return { dados, status, erro, recarregar };
}
