"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Aviso,
  Carregando,
  CartaoParticipante,
  ErroComBotao,
  Tela,
} from "@/components/ui";
import { chamarApi, ERRO_CONEXAO } from "@/lib/api";
import {
  CATEGORIAS,
  FANTASIA_MAX,
  NOME_MAX,
  ROTULOS,
  type Categoria,
  type Participante,
  type PorCategoria,
} from "@/lib/tipos";
import { useDados } from "@/lib/useDados";

type Situacao = {
  cadastroAberto: boolean;
  meus: PorCategoria<Participante | null>;
};

export default function Cadastro() {
  const { dados, erro, recarregar } = useDados<Situacao>("/api/cadastro");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [recemCadastrado, setRecemCadastrado] = useState<Participante | null>(
    null,
  );

  if (!dados) {
    return (
      <Tela emoji="✨" titulo="Cadastro de Fantasia">
        {erro ? (
          <ErroComBotao mensagem={erro} tentarDeNovo={recarregar} />
        ) : (
          <Carregando />
        )}
      </Tela>
    );
  }

  const livres = CATEGORIAS.filter((c) => !dados.meus[c]);
  const cadastrados = CATEGORIAS.flatMap((c) => dados.meus[c] ?? []);

  // ---------- Confirmação logo depois de cadastrar
  if (recemCadastrado) {
    // `dados` pode ainda não ter o cadastro novo (está recarregando).
    const outra = livres.find((c) => c !== recemCadastrado.categoria);
    return (
      <Tela emoji="🎉" titulo="Cadastro feito!">
        <div className="entrada">
          <CartaoParticipante participante={recemCadastrado} />
        </div>
        <p className="text-center text-lg text-white/90">
          Agora é só curtir a festa! No fim, a votação será aberta. 🗳️
        </p>
        {outra && dados.cadastroAberto && (
          <button
            type="button"
            className="botao botao-secundario"
            onClick={() => {
              setRecemCadastrado(null);
              setCategoria(outra);
            }}
          >
            {ROTULOS[outra].emoji} Cadastrar também na categoria{" "}
            {ROTULOS[outra].plural}
          </button>
        )}
      </Tela>
    );
  }

  return (
    <Tela emoji="✨" titulo="Cadastro de Fantasia">
      {cadastrados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-center text-lg font-semibold">
            ✅ {cadastrados.length > 1 ? "Seus cadastros" : "Seu cadastro"}
          </h2>
          {cadastrados.map((p) => (
            <CartaoParticipante key={p.id} participante={p} />
          ))}
        </section>
      )}

      {!dados.cadastroAberto ? (
        <Aviso emoji="🔒" titulo="Cadastro encerrado">
          As inscrições do concurso já foram fechadas.
        </Aviso>
      ) : livres.length === 0 ? (
        <p className="text-center text-lg text-white/90">
          Você já cadastrou nas duas categorias. Agora é só curtir a festa! 🥳
        </p>
      ) : categoria && livres.includes(categoria) ? (
        <Formulario
          categoria={categoria}
          voltar={() => setCategoria(null)}
          aoCadastrar={(p) => {
            setRecemCadastrado(p);
            setCategoria(null);
            recarregar();
          }}
          aoMudarSituacao={recarregar}
        />
      ) : (
        <section className="cartao space-y-4">
          <h2 className="text-center text-xl font-semibold">
            {cadastrados.length ? "Cadastrar mais alguém?" : "Quem vai participar?"}
          </h2>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={!livres.includes(c)}
              onClick={() => setCategoria(c)}
              className={c === "adulto" ? "botao" : "botao botao-secundario border-2 border-violet-200"}
            >
              <span className="text-2xl">{ROTULOS[c].emoji}</span>
              {ROTULOS[c].singular}
              {!livres.includes(c) && " ✓"}
            </button>
          ))}
          <p className="text-center text-sm text-tinta/60">
            Cada celular pode cadastrar 1 adulto e 1 criança.
          </p>
        </section>
      )}

      <Link href="/" className="mt-auto text-center text-white/70 underline">
        Voltar ao início
      </Link>
    </Tela>
  );
}

function Formulario({
  categoria,
  voltar,
  aoCadastrar,
  aoMudarSituacao,
}: {
  categoria: Categoria;
  voltar: () => void;
  aoCadastrar: (p: Participante) => void;
  aoMudarSituacao: () => void;
}) {
  const [nome, setNome] = useState("");
  const [fantasia, setFantasia] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const rotulo = ROTULOS[categoria];

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await chamarApi<{ participante?: Participante; erro?: string }>(
        "/api/cadastro",
        { metodo: "POST", corpo: { categoria, nome, fantasia } },
      );
      if (r.ok && r.dados.participante) {
        aoCadastrar(r.dados.participante);
        return;
      }
      setErro(r.dados.erro ?? "Não foi possível cadastrar. Tente de novo.");
      // Já cadastrado ou cadastro fechado: atualiza a tela para mostrar isso.
      if (r.status === 409 || r.status === 403) aoMudarSituacao();
    } catch {
      setErro(ERRO_CONEXAO);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="cartao entrada space-y-4">
      <p className="text-center text-xl font-semibold">
        {rotulo.emoji} Categoria {rotulo.plural}
      </p>
      <label className="block space-y-1">
        <span className="font-semibold">
          {categoria === "crianca" ? "Nome da criança" : "Nome"}
        </span>
        <input
          className="campo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={NOME_MAX}
          autoComplete="off"
          required
        />
      </label>
      <label className="block space-y-1">
        <span className="font-semibold">Qual é a fantasia?</span>
        <input
          className="campo"
          value={fantasia}
          onChange={(e) => setFantasia(e.target.value)}
          maxLength={FANTASIA_MAX}
          placeholder="Ex.: Homem-Aranha"
          autoComplete="off"
          required
        />
      </label>
      {erro && (
        <p className="rounded-xl bg-rose-100 px-3 py-2 text-rose-800">{erro}</p>
      )}
      <button
        type="submit"
        className="botao"
        disabled={enviando || !nome.trim() || !fantasia.trim()}
      >
        {enviando ? "Enviando…" : "Cadastrar 🎉"}
      </button>
      <button
        type="button"
        onClick={voltar}
        className="w-full text-center text-tinta/60 underline"
      >
        Trocar categoria
      </button>
    </form>
  );
}
