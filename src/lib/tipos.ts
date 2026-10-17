// Tipos e regras compartilhados entre as telas (navegador) e a API (servidor).

export const CATEGORIAS = ["adulto", "crianca"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const ROTULOS: Record<
  Categoria,
  { singular: string; plural: string; emoji: string }
> = {
  adulto: { singular: "Adulto", plural: "Adultos", emoji: "🦸" },
  crianca: { singular: "Criança", plural: "Crianças", emoji: "🧸" },
};

export function ehCategoria(valor: unknown): valor is Categoria {
  return CATEGORIAS.includes(valor as Categoria);
}

// O que os convidados podem ver de um participante.
export type Participante = {
  id: string;
  categoria: Categoria;
  nome: string;
  fantasia: string;
};

// Uma entrada por categoria (null = ainda não tem).
export type PorCategoria<T> = Record<Categoria, T>;

export const NOME_MAX = 60;
export const FANTASIA_MAX = 80;
