import type { Solicitacao } from '../types/solicitacao.types';

/**
 * Junta as respostas dos campos marcados como `exibirNaListagem` — útil pra
 * identificar quem respondeu um formulário público (sem usuário vinculado)
 * direto na tabela, sem abrir o drill-down de respostas.
 */
export function resumoRespostasVisiveis(item: Solicitacao): string | null {
  const campos = item.tipo.camposFormulario ?? [];
  const valores = campos
    .filter((campo) => campo.exibirNaListagem)
    .map((campo) => {
      const valor = item.respostasFormulario?.[campo.id];
      if (typeof valor === 'string') return valor || null;
      if (Array.isArray(valor)) return valor.join(', ') || null;
      if (valor && typeof valor === 'object' && 'nome' in valor) return valor.nome;
      return null;
    })
    .filter((v): v is string => !!v);
  return valores.length > 0 ? valores.join(' · ') : null;
}

/** Nome do colaborador logado, ou a identificação visível do formulário, ou o rótulo genérico. */
export function nomeExibidoSolicitacao(item: Solicitacao): string {
  return item.user?.nome ?? resumoRespostasVisiveis(item) ?? 'Resposta anônima';
}
