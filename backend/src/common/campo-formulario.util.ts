import { BadRequestException } from '@nestjs/common';

/** Formato de cada item de TipoSolicitacao.camposFormulario/Pesquisa.campos (Json) — ver dto/campo-formulario.dto.ts. */
export interface CampoFormularioValor {
  id: string;
  label: string;
  tipo: string;
  obrigatorio?: boolean;
  opcoes?: string[];
  mapeamento?: 'NOME' | 'EMAIL';
}

/** Reaproveitado por solicitações e pesquisas: mesmo formato de campos dinâmicos, mesma validação. */
export function validarRespostasContraCampos(
  campos: CampoFormularioValor[] | null,
  respostas: Record<string, unknown>,
  { exigirObrigatorios }: { exigirObrigatorios: boolean },
): void {
  const camposDef = campos ?? [];
  const idsValidos = new Set(camposDef.map((campo) => campo.id));
  for (const chave of Object.keys(respostas)) {
    if (!idsValidos.has(chave)) throw new BadRequestException('Resposta de formulário com campo desconhecido');
  }
  if (!exigirObrigatorios) return;
  for (const campo of camposDef) {
    if (!campo.obrigatorio || campo.tipo === 'ARQUIVO') continue;
    const valor = respostas[campo.id];
    const preenchido = Array.isArray(valor) ? valor.length > 0 : valor !== undefined && valor !== null && valor !== '';
    if (!preenchido) throw new BadRequestException(`Preencha o campo obrigatório "${campo.label}"`);
  }
}
