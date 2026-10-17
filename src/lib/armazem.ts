import { Redis } from "@upstash/redis";

/**
 * Onde os dados ficam guardados.
 *
 * - Na Vercel: no Upstash Redis criado pela aba "Storage" do projeto. A Vercel
 *   cria sozinha as variáveis KV_REST_API_URL e KV_REST_API_TOKEN.
 * - No seu computador (sem essas variáveis): na memória. Funciona para
 *   testar, mas tudo some quando o servidor reinicia.
 *
 * Só usamos "hashes" do Redis (uma chave com vários campos dentro), por isso a
 * interface abaixo é pequena.
 */
export interface Armazem {
  hget(chave: string, campo: string): Promise<unknown>;
  hgetall(chave: string): Promise<Record<string, unknown>>;
  hset(chave: string, campo: string, valor: string): Promise<void>;
  /** Grava só se o campo ainda não existir. Retorna true se gravou. */
  hsetnx(chave: string, campo: string, valor: string): Promise<boolean>;
  hdel(chave: string, ...campos: string[]): Promise<void>;
}

function criarRedis(url: string, token: string): Armazem {
  const redis = new Redis({ url, token });
  return {
    hget: (chave, campo) => redis.hget(chave, campo),
    hgetall: async (chave) => (await redis.hgetall(chave)) ?? {},
    hset: async (chave, campo, valor) => {
      await redis.hset(chave, { [campo]: valor });
    },
    hsetnx: async (chave, campo, valor) =>
      (await redis.hsetnx(chave, campo, valor)) === 1,
    hdel: async (chave, ...campos) => {
      if (campos.length) await redis.hdel(chave, ...campos);
    },
  };
}

// O cliente do Upstash converte de volta para objeto o que foi salvo como
// JSON. A versão em memória imita isso para os dois se comportarem igual.
function analisar(valor: string): unknown {
  try {
    return JSON.parse(valor);
  } catch {
    return valor;
  }
}

function criarMemoria(): Armazem {
  const dados = new Map<string, Map<string, string>>();
  const hash = (chave: string) => {
    let h = dados.get(chave);
    if (!h) dados.set(chave, (h = new Map()));
    return h;
  };
  return {
    hget: async (chave, campo) => {
      const v = hash(chave).get(campo);
      return v === undefined ? null : analisar(v);
    },
    hgetall: async (chave) =>
      Object.fromEntries(
        [...hash(chave)].map(([campo, v]) => [campo, analisar(v)]),
      ),
    hset: async (chave, campo, valor) => {
      hash(chave).set(campo, valor);
    },
    hsetnx: async (chave, campo, valor) => {
      const h = hash(chave);
      if (h.has(campo)) return false;
      h.set(campo, valor);
      return true;
    },
    hdel: async (chave, ...campos) => {
      for (const c of campos) hash(chave).delete(c);
    },
  };
}

// Lê a variável pelo nome padrão ou, se a Vercel tiver criado com um prefixo
// personalizado (ex.: FESTA_KV_REST_API_URL), pelo final do nome.
function variavel(...nomes: string[]): string | undefined {
  for (const nome of nomes) if (process.env[nome]) return process.env[nome];
  const comPrefixo = Object.keys(process.env).find((k) =>
    nomes.some((nome) => k.endsWith(`_${nome}`) && process.env[k]),
  );
  return comPrefixo ? process.env[comPrefixo] : undefined;
}

// Guardado no globalThis para sobreviver ao recarregamento do `npm run dev`.
const global = globalThis as { armazem?: Armazem };

export function armazem(): Armazem {
  if (global.armazem) return global.armazem;

  const url = variavel("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL");
  const token = variavel("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN");

  if (url && token) {
    global.armazem = criarRedis(url, token);
  } else if (process.env.VERCEL) {
    // Na Vercel a memória não é compartilhada entre requisições: sem o Redis
    // os cadastros sumiriam. Melhor falhar com uma mensagem clara.
    throw new Error(
      "Banco não configurado: crie o Upstash Redis na aba Storage do projeto na Vercel e faça um novo deploy.",
    );
  } else {
    console.warn(
      "⚠️  Sem Redis configurado: usando a memória (os dados somem ao reiniciar).",
    );
    global.armazem = criarMemoria();
  }
  return global.armazem;
}
