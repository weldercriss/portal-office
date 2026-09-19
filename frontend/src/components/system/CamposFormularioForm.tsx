import { FormField } from '../ui/Form';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import type { CampoFormulario } from '../../modules/tipos-solicitacao/types/tipo-solicitacao.types';

interface CamposFormularioFormProps {
  campos: CampoFormulario[];
  valores: Record<string, string>;
  onChangeValor: (campoId: string, valor: string) => void;
  arquivos: Record<string, File | null>;
  onChangeArquivo: (campoId: string, arquivo: File | null) => void;
  /** Nome do arquivo já enviado pra esse campo (edição), se houver. */
  anexosAtuais?: Record<string, string | undefined>;
}

export function CamposFormularioForm({
  campos,
  valores,
  onChangeValor,
  arquivos,
  onChangeArquivo,
  anexosAtuais,
}: CamposFormularioFormProps) {
  return (
    <>
      {campos.map((campo) => (
        <FormField key={campo.id} label={`${campo.label}${campo.obrigatorio ? ' *' : ''}`} htmlFor={`campo-formulario-${campo.id}`}>
          {campo.tipo === 'TEXTO' && (
            <Input
              id={`campo-formulario-${campo.id}`}
              value={valores[campo.id] ?? ''}
              onChange={(e) => onChangeValor(campo.id, e.target.value)}
              required={campo.obrigatorio}
            />
          )}
          {campo.tipo === 'NUMERO' && (
            <Input
              id={`campo-formulario-${campo.id}`}
              type="number"
              value={valores[campo.id] ?? ''}
              onChange={(e) => onChangeValor(campo.id, e.target.value)}
              required={campo.obrigatorio}
            />
          )}
          {campo.tipo === 'DATA' && (
            <Input
              id={`campo-formulario-${campo.id}`}
              type="date"
              value={valores[campo.id] ?? ''}
              onChange={(e) => onChangeValor(campo.id, e.target.value)}
              required={campo.obrigatorio}
            />
          )}
          {campo.tipo === 'SELECAO' && (
            <Select
              id={`campo-formulario-${campo.id}`}
              value={valores[campo.id] ?? ''}
              onChange={(e) => onChangeValor(campo.id, e.target.value)}
              required={campo.obrigatorio}
            >
              <option value="">Selecione...</option>
              {(campo.opcoes ?? []).map((opcao) => (
                <option key={opcao} value={opcao}>
                  {opcao}
                </option>
              ))}
            </Select>
          )}
          {campo.tipo === 'ARQUIVO' && (
            <div className="flex flex-col gap-1">
              {anexosAtuais?.[campo.id] && (
                <p className="text-xs text-[var(--color-text-muted)]">Arquivo atual: {anexosAtuais[campo.id]}</p>
              )}
              <Input
                id={`campo-formulario-${campo.id}`}
                type="file"
                onChange={(e) => onChangeArquivo(campo.id, e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </FormField>
      ))}
    </>
  );
}

export function valorInicialDosCampos(
  campos: CampoFormulario[],
  respostas: Record<string, string | string[] | { nome: string; caminho: string; mimeType: string }> | null | undefined,
): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const campo of campos) {
    const valor = respostas?.[campo.id];
    if (typeof valor === 'string') valores[campo.id] = valor;
  }
  return valores;
}
