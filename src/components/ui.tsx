import { ROTULOS, type Participante } from "@/lib/tipos";

// Moldura das telas dos convidados (coluna única, pensada para celular).
export function Tela({
  emoji,
  titulo,
  children,
}: {
  emoji: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8">
      <header className="text-center">
        <p className="text-5xl">{emoji}</p>
        <h1 className="titulo mt-2">{titulo}</h1>
      </header>
      {children}
    </main>
  );
}

export function Carregando() {
  return <p className="py-10 text-center text-lg text-white/80">Carregando… ⏳</p>;
}

export function ErroComBotao({
  mensagem,
  tentarDeNovo,
}: {
  mensagem: string;
  tentarDeNovo: () => void;
}) {
  return (
    <div className="cartao space-y-4 text-center">
      <p className="text-4xl">📡</p>
      <p>{mensagem}</p>
      <button type="button" onClick={tentarDeNovo} className="botao">
        Tentar de novo
      </button>
    </div>
  );
}

export function Aviso({
  emoji,
  titulo,
  children,
}: {
  emoji: string;
  titulo: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="cartao entrada space-y-2 text-center">
      <p className="text-5xl">{emoji}</p>
      <p className="text-2xl font-semibold">{titulo}</p>
      {children && <div className="text-tinta/75">{children}</div>}
    </div>
  );
}

export function CartaoParticipante({
  participante,
}: {
  participante: Participante;
}) {
  const rotulo = ROTULOS[participante.categoria];
  return (
    <div className="cartao flex items-center gap-4">
      <span className="text-4xl">{rotulo.emoji}</span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-roxo">
          {rotulo.plural}
        </p>
        <p className="text-xl font-semibold break-words">{participante.nome}</p>
        <p className="break-words text-tinta/70">🎭 {participante.fantasia}</p>
      </div>
    </div>
  );
}
