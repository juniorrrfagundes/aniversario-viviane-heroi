"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useAdmin } from "@/components/admin";

const FOLHAS = [
  {
    caminho: "/cadastro",
    emoji: "✨",
    titulo: "Cadastre sua fantasia!",
    texto: "Aponte a câmera do celular para o código e inscreva sua fantasia no concurso.",
    onde: "para a entrada da festa",
  },
  {
    caminho: "/votar",
    emoji: "🗳️",
    titulo: "Vote na melhor fantasia!",
    texto: "Aponte a câmera do celular para o código e escolha a melhor fantasia de cada categoria.",
    onde: "para o fim da festa",
  },
];

export default function QrCodes() {
  const { bloqueio } = useAdmin();
  if (bloqueio) return bloqueio;

  // Usa o endereço em que o site está aberto (o da Vercel, depois de publicar).
  const origem = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 print:max-w-none print:p-0">
      <div className="nao-imprimir mb-6 space-y-3">
        <Link href="/admin" className="text-white/70 underline">
          ← Voltar ao painel
        </Link>
        <h1 className="text-2xl font-bold">🖨️ QR Codes para imprimir</h1>
        <p className="text-white/85">
          Cada código sai em uma folha separada: um para a entrada e outro para o
          fim da festa.
        </p>
        {origem.includes("localhost") && (
          <p className="rounded-xl bg-amber-100 px-3 py-2 text-amber-900">
            ⚠️ Você está no seu computador (localhost): estes códigos só
            funcionam aqui. Imprima a partir do site publicado na Vercel.
          </p>
        )}
        <button type="button" onClick={() => window.print()} className="botao">
          🖨️ Imprimir
        </button>
      </div>

      <div className="space-y-6 print:space-y-0">
        {FOLHAS.map((f) => {
          const url = origem + f.caminho;
          return (
            <section key={f.caminho} className="folha-qr cartao text-center">
              <p className="nao-imprimir mb-2 text-sm font-semibold uppercase tracking-wide text-roxo">
                Folha {f.onde}
              </p>
              <p className="text-6xl">{f.emoji}</p>
              <h2 className="mt-2 text-4xl font-bold">{f.titulo}</h2>
              <p className="mx-auto mt-3 max-w-md text-lg text-tinta/75">{f.texto}</p>
              <div className="mx-auto mt-6 w-full max-w-[320px] print:max-w-[11cm]">
                <QRCodeSVG
                  value={url}
                  size={512}
                  level="M"
                  marginSize={2}
                  title={`QR Code: ${url}`}
                  className="h-auto w-full"
                />
              </div>
              <p className="mt-4 text-lg font-semibold break-all">{url}</p>
              <p className="mt-6 text-2xl">🎭 Concurso de Fantasias 🎉</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}
