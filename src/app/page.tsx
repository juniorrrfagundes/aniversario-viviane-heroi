import Link from "next/link";

export default function Inicio() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-8 px-4 py-10 text-center">
      <div>
        <p className="text-6xl">🎭</p>
        <h1 className="titulo mt-3">Concurso de Fantasias</h1>
        <p className="mt-3 text-lg text-white/85">
          Cadastre sua fantasia e, no fim da festa, vote na melhor!
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <Link href="/cadastro" className="botao">
          ✨ Cadastrar minha fantasia
        </Link>
        <Link href="/votar" className="botao botao-secundario">
          🗳️ Votar
        </Link>
      </div>
    </main>
  );
}
