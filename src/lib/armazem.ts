import { Redis } from "@upstash/redis";
import { createClient } from "redis";

/**
 * Onde os dados ficam guardados.
 *
 * - Na Vercel: no banco Redis criado pela aba "Storage" do projeto. Funciona
 *   com o "Redis" da Redis Inc. (variável REDIS_URL, tem plano grátis) e com o
 *   "Upstash for Redis" (variáveis KV_REST_API_URL e KV_REST_API_TOKEN). A
 *   Vercel cria essas variáveis sozinha ao conectar o banco.
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

// Redis "comum" (ex.: Redis Inc.), por conexão direta com REDIS_URL.
function criarRedisTcp(url: string): Armazem {
  // RESP 2: protocolo aceito por qualquer servidor Redis.
  const cliente = createClient({ url, RESP: 2 });
  cliente.on("error", (e) => console.error("Redis:", e));

  // A conexão é aberta uma vez e reaproveitada pelas próximas requisições
  // (o plano grátis limita quantas conexões podem existir ao mesmo tempo).
  // Se cair, o próprio cliente reconecta.
  let conectando: Promise<unknown> | null = null;
  async function pronto() {
    if (!cliente.isOpen) {
      conectando ??= cliente.connect().catch((e) => {
        conectando = null; // deixa a próxima requisição tentar de novo
        throw e;
      });
      await conectando;
    }
    return cliente;
  }

  return {
    hget: async (chave, campo) => (await pronto()).hGet(chave, campo),
    hgetall: async (chave) => (await pronto()).hGetAll(chave),
    hset: async (chave, campo, valor) => {
      await (await pronto()).hSet(chave, campo, valor);
    },
    hsetnx: async (chave, campo, valor) =>
      (await (await pronto()).hSetNX(chave, campo, valor)) === 1,
    hdel: async (chave, ...campos) => {
      if (campos.length) await (await pronto()).hDel(chave, campos);
    },
  };
}

// Upstash, pela API HTTP (KV_REST_API_URL + KV_REST_API_TOKEN).
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
  } else if (process.env.REDIS_URL) {
    global.armazem = criarRedisTcp(process.env.REDIS_URL);
  } else if (process.env.VERCEL) {
    // Na Vercel a memória não é compartilhada entre requisições: sem o Redis
    // os cadastros sumiriam. Melhor falhar com uma mensagem clara.
    throw new Error(
      "Banco não configurado: conecte um banco Redis ao projeto na aba Storage da Vercel e faça um novo deploy.",
    );
  } else {
    console.warn(
      "⚠️  Sem Redis configurado: usando a memória (os dados somem ao reiniciar).",
    );
    global.armazem = criarMemoria();
  }
  return global.armazem;
}
