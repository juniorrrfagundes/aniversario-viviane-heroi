"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAdmin, type Painel } from "@/components/admin";
import { chamarApi } from "@/lib/api";
import type { Placar } from "@/lib/concurso";
import { ROTULOS, type Categoria } from "@/lib/tipos";

/**
 * Tela para o telão/TV: revela os vencedores com suspense.
 * Avança com os botões ou com Espaço / Enter / seta para a direita.
 */

const ORDEM: Categoria[] = ["crianca", "adulto"]; // crianças primeiro
const SEGUNDOS_SUSPENSE = 3;

type Etapa =
  | { tipo: "inicio" }
  | { tipo: "suspense" | "revelado"; categoria: Categoria }
  | { tipo: "fim" };

const ETAPAS: Etapa[] = [
  { tipo: "inicio" },
  ...ORDEM.flatMap((categoria): Etapa[] => [
    { tipo: "suspense", categoria },
    { tipo: "revelado", categoria },
  ]),
  { tipo: "fim" },
];

export default function Telao() {
  const { dados, recarregar, bloqueio } = useAdmin();
  const [indice, setIndice] = useState(0);

  const avancar = useCallback(() => {
    // Durante o suspense não dá para pular; no fim, não há para onde ir.
    if (ETAPAS[indice].tipo === "suspense" || indice === ETAPAS.length - 1) return;
    // Ao entrar no suspense, busca os votos mais recentes.
    if (ETAPAS[indice + 1].tipo === "suspense") recarregar();
    setIndice(indice + 1);
  }, [indice, recarregar]);

  const fimDoSuspense = useCallback(() => {
    setIndice((i) => (ETAPAS[i].tipo === "suspense" ? i + 1 : i));
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (![" ", "Enter", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      avancar();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [avancar]);

  if (bloqueio || !dados) return bloqueio;
  const etapa = ETAPAS[indice];

  return (
    <main className="flex min-h-dvh w-full flex-col items-center justify-center gap-8 px-6 py-10 text-center">
      {etapa.tipo === "inicio" && (
        <Inicio dados={dados} recarregar={recarregar} comecar={avancar} />
      )}

      {etapa.tipo === "suspense" && (
        <Rufar
          key={indice}
          categoria={etapa.categoria}
          aoTerminar={fimDoSuspense}
        />
      )}

      {etapa.tipo === "revelado" && (
        <>
          <Confete key={indice} />
          <Revelacao categoria={etapa.categoria} placar={dados.placar[etapa.categoria]} />
          <button type="button" onClick={avancar} className="botao w-auto px-10 text-2xl">
            {ETAPAS[indice + 1].tipo === "fim" ? "Encerrar 🎉" : "Próxima categoria ▶"}
          </button>
        </>
      )}

      {etapa.tipo === "fim" && (
        <Fim dados={dados} recomecar={() => setIndice(0)} />
      )}
    </main>
  );
}

function Inicio({
  dados,
  recarregar,
  comecar,
}: {
  dados: Painel;
  recarregar: () => void;
  comecar: () => void;
}) {
  const [fechando, setFechando] = useState(false);

  async function fecharVotacao() {
    setFechando(true);
    await chamarApi("/api/admin/fases", {
      metodo: "PATCH",
      corpo: { votacao: false },
    }).catch(() => {});
    setFechando(false);
    recarregar();
  }

  function telaCheia() {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  return (
    <>
      <p className="text-8xl">🏆</p>
      <h1 className="titulo text-[clamp(2.5rem,7vw,6rem)]">Concurso de Fantasias</h1>
      <p className="text-[clamp(1.25rem,3vw,2.5rem)] text-white/90">
        Chegou a hora de revelar os vencedores!
      </p>

      {dados.fases.votacao && (
        <div className="cartao max-w-xl space-y-3">
          <p>⚠️ A votação ainda está aberta. Feche antes de revelar para ninguém votar depois.</p>
          <button
            type="button"
            onClick={fecharVotacao}
            disabled={fechando}
            className="w-full rounded-xl bg-rose-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {fechando ? "Fechando…" : "Fechar votação agora"}
          </button>
        </div>
      )}

      <button type="button" onClick={comecar} className="botao w-auto px-12 text-3xl">
        Começar ▶
      </button>

      <div className="flex flex-wrap items-center justify-center gap-4 text-white/70">
        <button type="button" onClick={telaCheia} className="underline">
          ⛶ Tela cheia
        </button>
        <span>Dica: avance com Espaço ou →</span>
        <Link href="/admin" className="underline">
          Voltar ao painel
        </Link>
      </div>
    </>
  );
}

function Rufar({
  categoria,
  aoTerminar,
}: {
  categoria: Categoria;
  aoTerminar: () => void;
}) {
  const [restante, setRestante] = useState(SEGUNDOS_SUSPENSE);

  useEffect(() => {
    let n = SEGUNDOS_SUSPENSE;
    const timer = setInterval(() => {
      n -= 1;
      if (n > 0) setRestante(n);
      else {
        clearInterval(timer);
        aoTerminar();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [aoTerminar]);

  const rotulo = ROTULOS[categoria];
  return (
    <>
      <p className="text-[clamp(1.5rem,4vw,3rem)] font-semibold text-amarelo">
        {rotulo.emoji} Categoria {rotulo.plural}
      </p>
      <h1 className="titulo text-[clamp(2.5rem,7vw,6rem)]">E a melhor fantasia é…</h1>
      <p key={restante} className="entrada text-[clamp(6rem,20vw,14rem)] font-bold">
        🥁 {restante}
      </p>
    </>
  );
}

function Revelacao({ categoria, placar }: { categoria: Categoria; placar: Placar }) {
  const rotulo = ROTULOS[categoria];
  const vencedores = placar.participantes.filter((p) =>
    placar.vencedores.includes(p.id),
  );

  return (
    <>
      <p className="text-[clamp(1.5rem,4vw,3rem)] font-semibold text-amarelo">
        🏆 Melhor fantasia · {rotulo.plural} {rotulo.emoji}
      </p>

      {vencedores.length === 0 ? (
        <p className="titulo text-[clamp(2rem,5vw,4rem)]">
          Nenhum voto nesta categoria 🤷
        </p>
      ) : (
        <>
          {vencedores.length > 1 && (
            <p className="entrada text-[clamp(2rem,5vw,4rem)] font-bold">🤝 Empate!</p>
          )}
          <div className="flex flex-wrap items-stretch justify-center gap-6">
            {vencedores.map((p) => (
              <div key={p.id} className="cartao entrada min-w-[16rem] max-w-3xl px-10 py-8">
                <p className="text-[clamp(3rem,8vw,6rem)]">👑</p>
                <p className="text-[clamp(2.5rem,7vw,6rem)] leading-tight font-bold break-words">
                  {p.nome}
                </p>
                <p className="mt-2 text-[clamp(1.5rem,4vw,3rem)] break-words text-tinta/75">
                  🎭 {p.fantasia}
                </p>
              </div>
            ))}
          </div>
          <p className="text-[clamp(1.25rem,3vw,2.25rem)] text-white/90">
            com {vencedores[0].votos} {vencedores[0].votos === 1 ? "voto" : "votos"}
          </p>
        </>
      )}
    </>
  );
}

function Fim({ dados, recomecar }: { dados: Painel; recomecar: () => void }) {
  return (
    <>
      <p className="text-8xl">🎉</p>
      <h1 className="titulo text-[clamp(2.5rem,7vw,6rem)]">Parabéns aos vencedores!</h1>
      <div className="flex flex-wrap justify-center gap-6">
        {ORDEM.map((c) => {
          const placar = dados.placar[c];
          const nomes = placar.participantes
            .filter((p) => placar.vencedores.includes(p.id))
            .map((p) => `${p.nome} (${p.fantasia})`);
          return (
            <div key={c} className="cartao min-w-[16rem] max-w-xl">
              <p className="text-xl font-semibold text-roxo">
                {ROTULOS[c].emoji} {ROTULOS[c].plural}
              </p>
              <p className="mt-1 text-[clamp(1.5rem,3vw,2.5rem)] font-bold">
                {nomes.length ? nomes.join(" · ") : "Sem votos"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="flex gap-6 text-white/70">
        <button type="button" onClick={recomecar} className="underline">
          ↺ Mostrar de novo
        </button>
        <Link href="/admin" className="underline">
          Voltar ao painel
        </Link>
      </div>
    </>
  );
}

// Chuva de confete por alguns segundos.
function Confete() {
  useEffect(() => {
    const fim = Date.now() + 4000;
    const timer = setInterval(() => {
      if (Date.now() > fim) return clearInterval(timer);
      confetti({
        particleCount: 70,
        spread: 110,
        startVelocity: 50,
        origin: { x: Math.random(), y: 0.2 + Math.random() * 0.3 },
      });
    }, 300);
    return () => {
      clearInterval(timer);
      confetti.reset();
    };
  }, []);
  return null;
}
