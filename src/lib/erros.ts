import { unstable_rethrow } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * Envolve uma rota da API: se algo falhar no servidor (ex.: banco não
 * configurado), responde com a mensagem em JSON em vez de um erro 500 vazio.
 * Assim a tela mostra o motivo e fica fácil descobrir o que ajustar.
 */
export function comTratamento<A extends unknown[]>(
  rota: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await rota(...args);
    } catch (e) {
      // Erros internos do Next (ex.: o aviso de "esta rota é dinâmica" durante
      // o build) precisam seguir adiante, não virar resposta de erro.
      unstable_rethrow(e);
      console.error(e);
      const detalhe = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { erro: `Erro no servidor: ${detalhe}`.slice(0, 300) },
        { status: 500 },
      );
    }
  };
}
