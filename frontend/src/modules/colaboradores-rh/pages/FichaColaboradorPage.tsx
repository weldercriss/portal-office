import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import {
  useChecklist,
  useCreateDependente,
  useCreateHistorico,
  useDeleteDependente,
  useDeleteDocumento,
  useDeleteHistorico,
  useDependentes,
  useDocumentos,
  useGerarChecklistPadrao,
  useHistorico,
  useUpdateChecklistItem,
  useUploadDocumento,
} from '../hooks/useColaboradorRh';
import { TIPOS_DOCUMENTO } from '../types/colaborador-rh.types';
import { visualizarDocumento } from '../utils/documento';

const ABAS = [
  'dependentes',
  'historico',
  'checklist',
  'documentos',
] as const;
type Aba = (typeof ABAS)[number];

const LABEL_ABA: Record<Aba, string> = {
  dependentes: 'Dependentes',
  historico: 'Histórico profissional',
  checklist: 'Checklist de admissão',
  documentos: 'Documentos',
};

function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function FichaColaboradorPage() {
  const { id } = useParams<{ id: string }>();
  const userId = id ?? '';
  const usuariosQuery = useUsuarios();
  const usuario = usuariosQuery.data?.find((u) => u.id === userId);
  const [aba, setAba] = useState<Aba>('dependentes');

  return (
    <PageShell>
      <PageHeader
        title={usuario ? `Ficha de ${usuario.nome}` : 'Ficha do colaborador'}
        description={usuario?.email}
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-[var(--color-border)] pb-3">
        {ABAS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setAba(item)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
              aba === item
                ? 'bg-[var(--color-primary)] text-[var(--color-text-inverse)]'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
            }`}
          >
            {LABEL_ABA[item]}
          </button>
        ))}
      </div>

      {aba === 'dependentes' && <SecaoDependentes userId={userId} />}
      {aba === 'historico' && <SecaoHistorico userId={userId} />}
      {aba === 'checklist' && <SecaoChecklist userId={userId} />}
      {aba === 'documentos' && <SecaoDocumentos userId={userId} />}
    </PageShell>
  );
}

function SecaoDependentes({ userId }: { userId: string }) {
  const query = useDependentes(userId);
  const createMutation = useCreateDependente(userId);
  const deleteMutation = useDeleteDependente(userId);
  const [nome, setNome] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await createMutation.mutateAsync({ nome, parentesco, dataNascimento: dataNascimento || undefined });
    setNome('');
    setParentesco('');
    setDataNascimento('');
  }

  return (
    <Card elevated className="p-6">
      <ul className="mb-4 flex flex-col gap-2">
        {(query.data ?? []).map((dependente) => (
          <li
            key={dependente.id}
            className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2"
          >
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{dependente.nome}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {dependente.parentesco} · {formatarData(dependente.dataNascimento)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[var(--color-danger)]"
              onClick={() => deleteMutation.mutate(dependente.id)}
              aria-label={`Excluir ${dependente.nome}`}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {(query.data ?? []).length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum dependente cadastrado.</p>
        )}
      </ul>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-3">
        <FormField label="Nome" htmlFor="dep-nome">
          <Input id="dep-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="Parentesco" htmlFor="dep-parentesco">
          <Input id="dep-parentesco" value={parentesco} onChange={(e) => setParentesco(e.target.value)} required />
        </FormField>
        <FormField label="Data de nascimento" htmlFor="dep-nascimento">
          <Input id="dep-nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
        </FormField>
        <FormActions>
          <Button type="submit" disabled={createMutation.isPending}>
            Adicionar dependente
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

function SecaoHistorico({ userId }: { userId: string }) {
  const query = useHistorico(userId);
  const createMutation = useCreateHistorico(userId);
  const deleteMutation = useDeleteHistorico(userId);
  const [cargo, setCargo] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [observacao, setObservacao] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await createMutation.mutateAsync({ cargo, departamento: departamento || undefined, dataInicio, observacao: observacao || undefined });
    setCargo('');
    setDepartamento('');
    setDataInicio('');
    setObservacao('');
  }

  return (
    <Card elevated className="p-6">
      <ul className="mb-4 flex flex-col gap-2">
        {(query.data ?? []).map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-primary)]">{item.cargo}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {item.departamento ?? '—'} · desde {formatarData(item.dataInicio)}
                {item.dataFim ? ` até ${formatarData(item.dataFim)}` : ''}
              </p>
              {item.observacao && <p className="text-xs text-[var(--color-text-secondary)]">{item.observacao}</p>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[var(--color-danger)]"
              onClick={() => deleteMutation.mutate(item.id)}
              aria-label={`Excluir ${item.cargo}`}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {(query.data ?? []).length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum registro de histórico ainda.</p>
        )}
      </ul>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
        <FormField label="Cargo" htmlFor="hist-cargo">
          <Input id="hist-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} required />
        </FormField>
        <FormField label="Departamento (opcional)" htmlFor="hist-departamento">
          <Input id="hist-departamento" value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
        </FormField>
        <FormField label="Data de início" htmlFor="hist-inicio">
          <Input id="hist-inicio" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} required />
        </FormField>
        <FormField label="Observação (opcional)" htmlFor="hist-obs">
          <Input id="hist-obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </FormField>
        <FormActions>
          <Button type="submit" disabled={createMutation.isPending}>
            Adicionar ao histórico
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

function SecaoChecklist({ userId }: { userId: string }) {
  const query = useChecklist(userId);
  const gerarPadraoMutation = useGerarChecklistPadrao(userId);
  const updateMutation = useUpdateChecklistItem(userId);

  return (
    <Card elevated className="p-6">
      {(query.data ?? []).length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum item de checklist ainda.</p>
          <Button onClick={() => gerarPadraoMutation.mutate()} disabled={gerarPadraoMutation.isPending}>
            Gerar checklist de admissão padrão
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {(query.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
              <span
                className={`text-sm ${item.status === 'CONCLUIDO' ? 'text-[var(--color-text-secondary)] line-through' : 'font-medium text-[var(--color-text-primary)]'}`}
              >
                {item.titulo}
              </span>
              <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={item.status === 'CONCLUIDO'}
                  onChange={(e) =>
                    updateMutation.mutate({ id: item.id, status: e.target.checked ? 'CONCLUIDO' : 'PENDENTE' })
                  }
                />
                Concluído
              </label>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function SecaoDocumentos({ userId }: { userId: string }) {
  const query = useDocumentos(userId);
  const uploadMutation = useUploadDocumento(userId);
  const deleteMutation = useDeleteDocumento(userId);
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS_DOCUMENTO)[number]['value']>('OUTRO');
  const [validade, setValidade] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!arquivo) {
      setErro('Selecione um arquivo');
      return;
    }
    try {
      await uploadMutation.mutateAsync({ nome, tipo, validade: validade || undefined, arquivo });
      setNome('');
      setValidade('');
      setArquivo(null);
    } catch {
      setErro('Não foi possível enviar o documento.');
    }
  }

  return (
    <Card elevated className="p-6">
      <ul className="mb-4 flex flex-col gap-2">
        {(query.data ?? []).map((doc) => (
          <li key={doc.id} className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2">
            <div>
              <button
                type="button"
                onClick={() => visualizarDocumento(userId, doc.id)}
                className="text-sm font-bold text-[var(--color-primary)] hover:underline"
              >
                {doc.nome}
              </button>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {TIPOS_DOCUMENTO.find((t) => t.value === doc.tipo)?.label} · enviado em {formatarData(doc.criadoEm)}
                {doc.validade ? ` · válido até ${formatarData(doc.validade)}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-[var(--color-danger)]"
              onClick={() => deleteMutation.mutate(doc.id)}
              aria-label={`Excluir ${doc.nome}`}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </Button>
          </li>
        ))}
        {(query.data ?? []).length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum documento enviado.</p>
        )}
      </ul>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 border-t border-[var(--color-border)] pt-4 sm:grid-cols-2">
        <FormField label="Nome do documento" htmlFor="doc-nome">
          <Input id="doc-nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </FormField>
        <FormField label="Tipo" htmlFor="doc-tipo">
          <Select id="doc-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
            {TIPOS_DOCUMENTO.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Validade (opcional)" htmlFor="doc-validade">
          <Input id="doc-validade" type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
        </FormField>
        <FormField label="Arquivo (JPG/PNG/PDF/DOC/DOCX)" htmlFor="doc-arquivo" error={erro ?? undefined}>
          <Input
            id="doc-arquivo"
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </FormField>
        <FormActions>
          <Button type="submit" disabled={uploadMutation.isPending}>
            Enviar documento
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}

