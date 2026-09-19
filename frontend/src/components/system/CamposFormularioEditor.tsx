import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useCreateTemplateFormulario, useTemplatesFormulario } from '../../modules/tipos-solicitacao/hooks/useTemplatesFormulario';
import type { CampoFormulario, CampoFormularioTipo } from '../../modules/tipos-solicitacao/types/tipo-solicitacao.types';

const TIPO_LABEL: Record<CampoFormularioTipo, string> = {
  TEXTO: 'Texto',
  NUMERO: 'Número',
  DATA: 'Data',
  SELECAO: 'Seleção (dropdown)',
  ARQUIVO: 'Anexo de arquivo',
};

function novoCampo(): CampoFormulario {
  return { id: crypto.randomUUID(), label: '', tipo: 'TEXTO', obrigatorio: false };
}

const TODOS_OS_TIPOS = Object.keys(TIPO_LABEL) as CampoFormularioTipo[];

interface CamposFormularioEditorProps {
  value: CampoFormulario[];
  onChange: (campos: CampoFormulario[]) => void;
  /** Mostra o seletor "Usar como" (Nome/E-mail), exigido pelo backend quando o tipo é pré-admissão. */
  ehPreAdmissao?: boolean;
  /** Restringe os tipos de campo oferecidos (ex.: pesquisas não aceitam ARQUIVO). Padrão: todos. */
  tiposPermitidos?: CampoFormularioTipo[];
}

export function CamposFormularioEditor({ value, onChange, ehPreAdmissao, tiposPermitidos }: CamposFormularioEditorProps) {
  const templatesQuery = useTemplatesFormulario();
  const criarTemplateMutation = useCreateTemplateFormulario();
  const [templateSelecionado, setTemplateSelecionado] = useState('');
  const [salvandoTemplate, setSalvandoTemplate] = useState(false);
  const [nomeTemplate, setNomeTemplate] = useState('');

  function atualizarCampo(index: number, alteracoes: Partial<CampoFormulario>) {
    onChange(value.map((campo, i) => (i === index ? { ...campo, ...alteracoes } : campo)));
  }

  function removerCampo(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function usarTemplate(templateId: string) {
    setTemplateSelecionado(templateId);
    const template = (templatesQuery.data ?? []).find((t) => t.id === templateId);
    if (!template) return;
    onChange(template.campos.map((campo) => ({ ...campo, id: crypto.randomUUID() })));
  }

  async function confirmarSalvarTemplate() {
    if (!nomeTemplate.trim() || value.length === 0) return;
    await criarTemplateMutation.mutateAsync({ nome: nomeTemplate.trim(), campos: value });
    setSalvandoTemplate(false);
    setNomeTemplate('');
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-field)] border border-[var(--color-border)] p-3">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Usar template de formulário"
          value={templateSelecionado}
          onChange={(e) => usarTemplate(e.target.value)}
          className="max-w-[240px]"
        >
          <option value="">Usar template...</option>
          {(templatesQuery.data ?? []).map((template) => (
            <option key={template.id} value={template.id}>
              {template.nome}
            </option>
          ))}
        </Select>
        {!salvandoTemplate && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setSalvandoTemplate(true)} disabled={value.length === 0}>
            Salvar como template
          </Button>
        )}
      </div>

      {salvandoTemplate && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder="Nome do template"
            value={nomeTemplate}
            onChange={(e) => setNomeTemplate(e.target.value)}
          />
          <Button type="button" size="sm" onClick={confirmarSalvarTemplate} disabled={criarTemplateMutation.isPending}>
            Confirmar
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setSalvandoTemplate(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {value.map((campo, index) => (
        <div key={campo.id} className="flex flex-col gap-2 rounded-[var(--radius-field)] border border-[var(--color-border)] p-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Nome do campo"
              value={campo.label}
              onChange={(e) => atualizarCampo(index, { label: e.target.value })}
              className="flex-1"
            />
            <Select
              aria-label="Tipo do campo"
              value={campo.tipo}
              onChange={(e) => atualizarCampo(index, { tipo: e.target.value as CampoFormularioTipo })}
              className="max-w-[180px]"
            >
              {(tiposPermitidos ?? TODOS_OS_TIPOS).map((tipo) => (
                <option key={tipo} value={tipo}>
                  {TIPO_LABEL[tipo]}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[var(--color-danger)]"
              onClick={() => removerCampo(index)}
              aria-label={`Remover campo ${campo.label || index + 1}`}
              title="Remover campo"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
          {campo.tipo === 'SELECAO' && (
            <Input
              placeholder="Opções separadas por vírgula"
              value={(campo.opcoes ?? []).join(', ')}
              onChange={(e) =>
                atualizarCampo(index, { opcoes: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })
              }
            />
          )}
          {ehPreAdmissao && (
            <Select
              aria-label={`Usar como (${campo.label || index + 1})`}
              value={campo.mapeamento ?? ''}
              onChange={(e) =>
                atualizarCampo(index, { mapeamento: (e.target.value || undefined) as CampoFormulario['mapeamento'] })
              }
              className="max-w-[220px]"
            >
              <option value="">Usar como...</option>
              <option value="NOME">Nome do colaborador</option>
              <option value="EMAIL">E-mail do colaborador</option>
            </Select>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={campo.obrigatorio ?? false}
                onChange={(e) => atualizarCampo(index, { obrigatorio: e.target.checked })}
              />
              Obrigatório
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={campo.exibirNaListagem ?? false}
                onChange={(e) => atualizarCampo(index, { exibirNaListagem: e.target.checked })}
              />
              Mostrar na listagem (sem abrir o formulário)
            </label>
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={() => onChange([...value, novoCampo()])} className="gap-1.5">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Adicionar campo
      </Button>
    </div>
  );
}
