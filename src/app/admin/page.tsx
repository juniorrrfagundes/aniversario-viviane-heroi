"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin";
import { chamarApi, ERRO_CONEXAO } from "@/lib/api";
import type { Fases, LinhaPlacar, Placar } from "@/lib/concurso";
import { CATEGORIAS, ROTULOS, type Categoria } from "@/lib/tipos";

export default function PainelAdmin() {
  const { dados, erro, recarregar, bloqueio } = useAdmin(3000);
  const [aba, setAba] = useState<Categoria>("adulto");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  if (bloqueio || !dados) return bloqueio;

  async function acao(fn: () => Promise<{ ok: boolean; dados: { erro?: string } }>) {
    setOcupado(true);
    setAviso(null);
    try {
      const r = await fn();
      if (!r.ok) setAviso(r.dados.erro ?? "Algo deu errado. Tente de novo.");
      recarregar();
    } catch {
      setAviso(ERRO_CONEXAO);
    } finally {
      setOcupado(false);
    }
  }

  const mudarFase = (fase: keyof Fases, aberta: boolean) =>
    acao(() =>
      chamarApi("/api/admin/fases", { metodo: "PATCH", corpo: { [fase]: aberta } }),
    );

  const excluir = (p: LinhaPlacar) => {
    const ok = window.confirm(
      `Excluir o cadastro de ${p.nome} (${p.fantasia})?\n\nOs votos que essa pessoa recebeu serão apagados, e quem votou nela poderá votar de novo.`,
    );
    if (ok) acao(() => chamarApi(`/api/admin/participantes/${p.id}`, { metodo: "DELETE" }));
  };

  const sair = async () => {
    await chamarApi("/api/admin/login", { metodo: "DELETE" }).catch(() => {});
    recarregar();
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">🛠️ Painel do Concurso</h1>
        <button type="button" onClick={sair} className="text-white/70 underline">
          Sair
        </button>
      </header>

      <nav className="grid grid-cols-2 gap-3">
        <Link href="/admin/qrcodes" className="botao botao-secundario text-base">
          🖨️ QR Codes
        </Link>
        <Link href="/admin/telao" className="botao text-base">
          🏆 Revelar vencedores
        </Link>
      </nav>

      <section className="cartao space-y-3">
        <h2 className="text-lg font-semibold">Fases da festa</h2>
        <ControleFase
          nome="Cadastro"
          estados={["Aberto", "Fechado"]}
          aberta={dados.fases.cadastro}
          ocupado={ocupado}
          alternar={() => mudarFase("cadastro", !dados.fases.cadastro)}
        />
        <ControleFase
          nome="Votação"
          estados={["Aberta", "Fechada"]}
          aberta={dados.fases.votacao}
          ocupado={ocupado}
          alternar={() => mudarFase("votacao", !dados.fases.votacao)}
        />
      </section>

      {aviso && (
        <p className="rounded-xl bg-rose-100 px-3 py-2 text-rose-800">{aviso}</p>
      )}

      <div role="tablist" className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1.5">
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === aba}
            onClick={() => setAba(c)}
            className={`rounded-xl px-3 py-2 font-semibold transition ${
              c === aba ? "bg-white text-tinta shadow" : "text-white/85"
            }`}
          >
            {ROTULOS[c].emoji} {ROTULOS[c].plural}
            <span className="block text-xs font-normal opacity-75">
              {plural(dados.placar[c].participantes.length, "inscrito", "inscritos")}{" "}
              · {plural(dados.placar[c].totalVotos, "voto", "votos")}
            </span>
          </button>
        ))}
      </div>

      <ListaCategoria placar={dados.placar[aba]} ocupado={ocupado} excluir={excluir} />

      <p className="text-center text-sm text-white/60">
        {erro ? `⚠️ ${erro}` : "Atualiza sozinho a cada 3 segundos."}
      </p>
    </main>
  );
}

function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

function ControleFase({
  nome,
  estados,
  aberta,
  ocupado,
  alternar,
}: {
  nome: string;
  estados: [aberta: string, fechada: string];
  aberta: boolean;
  ocupado: boolean;
  alternar: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-violet-50 px-4 py-3">
      <div>
        <p className="font-semibold">{nome}</p>
        <p className={aberta ? "text-emerald-600" : "text-rose-600"}>
          {aberta ? `🟢 ${estados[0]}` : `🔴 ${estados[1]}`}
        </p>
      </div>
      <button
        type="button"
        disabled={ocupado}
        onClick={alternar}
        className={`rounded-xl px-4 py-2 font-semibold text-white disabled:opacity-50 ${
          aberta ? "bg-rose-500" : "bg-emerald-500"
        }`}
      >
        {aberta ? "Fechar" : "Abrir"}
      </button>
    </div>
  );
}

function ListaCategoria({
  placar,
  ocupado,
  excluir,
}: {
  placar: Placar;
  ocupado: boolean;
  excluir: (p: LinhaPlacar) => void;
}) {
  const { participantes, vencedores } = placar;
  if (participantes.length === 0) {
    return <p className="cartao text-center">Ninguém se cadastrou ainda.</p>;
  }

  const lideres = participantes.filter((p) => vencedores.includes(p.id));
  const maximo = Math.max(1, participantes[0].votos);

  return (
    <section className="space-y-3">
      <div className="cartao bg-amber-50 text-center">
        {lideres.length === 0 ? (
          <p>Nenhum voto ainda.</p>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
              {lideres.length > 1 ? `🤝 Empate (${lideres.length})` : "👑 Na liderança"}
            </p>
            <p className="text-xl font-semibold">
              {lideres.map((p) => `${p.nome} (${p.fantasia})`).join(" · ")}
            </p>
            <p className="text-tinta/70">
              {plural(lideres[0].votos, "voto", "votos")}
            </p>
          </>
        )}
      </div>

      <ul className="space-y-2">
        {participantes.map((p) => (
          <li key={p.id} className="cartao flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">
                {vencedores.includes(p.id) && "👑 "}
                {p.nome}
              </p>
              <p className="text-sm break-words text-tinta/70">🎭 {p.fantasia}</p>
              <div className="mt-1.5 h-2 rounded-full bg-violet-100">
                <div
                  className="h-2 rounded-full bg-roxo transition-all"
                  style={{ width: `${(p.votos / maximo) * 100}%` }}
                />
              </div>
            </div>
            <p className="w-12 text-center text-2xl font-bold">{p.votos}</p>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => excluir(p)}
              aria-label={`Excluir ${p.nome}`}
              className="rounded-xl px-2 py-2 text-xl hover:bg-rose-50 disabled:opacity-40"
            >
              🗑️
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
