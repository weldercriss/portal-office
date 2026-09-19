import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Folder, Search, Trash2, Upload } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { resolverAvatarUrl } from '../../../lib/avatarUrl';
import { useCategoriasDocumento } from '../../categorias-documento/hooks/useCategoriasDocumento';
import { DocumentoPreviewDialog } from '../../colaboradores-rh/components/DocumentoPreviewDialog';
import { useDeleteDocumento, useDocumentos, useUploadDocumento } from '../../colaboradores-rh/hooks/useColaboradorRh';
import { useDocumentoPreview } from '../../colaboradores-rh/hooks/useDocumentoPreview';
import { useResumoDocumentos } from '../hooks/useCentralDocumentos';
import type { ColaboradorResumoDocumentos } from '../types/central-documentos.types';

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** Central de Documentos > Departamento > Colaborador > Categoria > arquivo. */
export default function CentralDocumentosPage() {
  const resumoQuery = useResumoDocumentos();
  const [departamento, setDepartamento] = useState<string | null>(null);
  const [colaboradorId, setColaboradorId] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);

  const porDepartamento = useMemo(() => {
    const grupos = new Map<string, ColaboradorResumoDocumentos[]>();
    for (const colaborador of resumoQuery.data ?? []) {
      const chave = colaborador.group?.nome ?? 'Sem departamento';
      grupos.set(chave, [...(grupos.get(chave) ?? []), colaborador]);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resumoQuery.data]);

  const colaboradoresDoDepartamento = porDepartamento.find(([nome]) => nome === departamento)?.[1] ?? [];
  const colaborador = colaboradoresDoDepartamento.find((c) => c.id === colaboradorId) ?? null;

  if (resumoQuery.isError) {
    return <ErrorState message="Não foi possível carregar a Central de Documentos." onRetry={() => resumoQuery.refetch()} />;
  }
  if (resumoQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  const migalhas = ['Central de Documentos', departamento, colaborador?.nome, categoria].filter(Boolean).join(' > ');

  return (
    <PageShell>
      <PageHeader title="Central de Documentos" description={migalhas} />

      {colaboradorId ? (
        <SecaoColaborador
          colaborador={colaborador}
          categoria={categoria}
          onVoltar={() => (categoria ? setCategoria(null) : setColaboradorId(null))}
          onSelecionarCategoria={setCategoria}
        />
      ) : departamento ? (
        <SecaoColaboradores
          key={departamento}
          colaboradores={colaboradoresDoDepartamento}
          onVoltar={() => setDepartamento(null)}
          onSelecionar={setColaboradorId}
        />
      ) : (
        <SecaoDepartamentos porDepartamento={porDepartamento} onSelecionar={setDepartamento} />
      )}
    </PageShell>
  );
}

function Pasta({ label, sublabel, onClick }: { label: string; sublabel?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
    >
      <Folder aria-hidden="true" className="h-6 w-6 text-[var(--color-primary)]" />
      <span className="text-sm font-bold text-[var(--color-text-primary)]">{label}</span>
      {sublabel && <span className="text-xs text-[var(--color-text-secondary)]">{sublabel}</span>}
    </button>
  );
}

function SecaoDepartamentos({
  porDepartamento,
  onSelecionar,
}: {
  porDepartamento: [string, ColaboradorResumoDocumentos[]][];
  onSelecionar: (departamento: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {porDepartamento.map(([nome, colaboradores]) => (
        <Pasta
          key={nome}
          label={nome}
          sublabel={`${colaboradores.length} colaborador${colaboradores.length === 1 ? '' : 'es'}`}
          onClick={() => onSelecionar(nome)}
        />
      ))}
    </div>
  );
}

function SecaoColaboradores({
  colaboradores,
  onVoltar,
  onSelecionar,
}: {
  colaboradores: ColaboradorResumoDocumentos[];
  onVoltar: () => void;
  onSelecionar: (id: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const colaboradoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return colaboradores;
    return colaboradores.filter((c) => c.nome.toLowerCase().includes(termo));
  }, [colaboradores, busca]);

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={onVoltar} className="w-fit gap-2">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Departamentos
      </Button>
      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar colaborador..."
          className="pl-9"
          aria-label="Buscar colaborador"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {colaboradoresFiltrados.map((colaborador) => (
          <button
            key={colaborador.id}
            type="button"
            onClick={() => onSelecionar(colaborador.id)}
            className="flex flex-col items-center gap-2 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center transition-colors hover:bg-[var(--color-surface-hover)]"
          >
            {colaborador.avatarUrl ? (
              <img src={resolverAvatarUrl(colaborador.avatarUrl)!} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-hover)] text-lg font-bold text-[var(--color-text-secondary)]">
                {colaborador.nome.trim().charAt(0).toUpperCase()}
              </span>
            )}
            <span className="text-sm font-bold text-[var(--color-text-primary)]">{colaborador.nome}</span>
            <span className="text-xs text-[var(--color-text-secondary)]">
              {colaborador._count.documentos} documento{colaborador._count.documentos === 1 ? '' : 's'}
            </span>
          </button>
        ))}
        {colaboradoresFiltrados.length === 0 && (
          <p className="col-span-full text-sm text-[var(--color-text-secondary)]">
            {busca ? 'Nenhum colaborador encontrado.' : 'Nenhum colaborador neste departamento.'}
          </p>
        )}
      </div>
    </div>
  );
}

function SecaoColaborador({
  colaborador,
  categoria,
  onVoltar,
  onSelecionarCategoria,
}: {
  colaborador: ColaboradorResumoDocumentos | null;
  categoria: string | null;
  onVoltar: () => void;
  onSelecionarCategoria: (categoria: string | null) => void;
}) {
  const documentosQuery = useDocumentos(colaborador?.id ?? '');
  const categoriasQuery = useCategoriasDocumento();
  const deleteMutation = useDeleteDocumento(colaborador?.id ?? '');
  const { preview, abrir, fechar } = useDocumentoPreview();
  const documentos = documentosQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];

  const porCategoria = useMemo(() => {
    const grupos = new Map<string, typeof documentos>();
    for (const c of categorias) grupos.set(c.nome, []);
    for (const doc of documentos) {
      grupos.set(doc.categoria.nome, [...(grupos.get(doc.categoria.nome) ?? []), doc]);
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [documentos, categorias]);

  if (documentosQuery.isLoading) return <LoadingState rows={3} />;

  const categoriaAtualId = categorias.find((c) => c.nome === categoria)?.id ?? '';

  if (!categoria) {
    const categoriasComArquivos = porCategoria.filter(([, itens]) => itens.length > 0);
    return (
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" onClick={onVoltar} className="w-fit gap-2">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Colaboradores
        </Button>
        {categoriasComArquivos.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">Nenhum documento enviado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {categoriasComArquivos.map(([nome, itens]) => (
              <Pasta key={nome} label={nome} sublabel={`${itens.length} arquivo${itens.length === 1 ? '' : 's'}`} onClick={() => onSelecionarCategoria(nome)} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const arquivos = porCategoria.find(([nome]) => nome === categoria)?.[1] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" onClick={onVoltar} className="w-fit gap-2">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Categorias
      </Button>
      <Card elevated className="p-4">
        <ul className="flex flex-col gap-2">
          {arquivos.map((arquivo) => (
            <li key={arquivo.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
              <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]" />
              <button
                type="button"
                onClick={() => abrir(colaborador!.id, arquivo.id, arquivo.nome)}
                className="min-w-0 flex-1 truncate text-left text-sm font-bold text-[var(--color-primary)] hover:underline"
              >
                {arquivo.nome}
              </button>
              <span className="text-xs text-[var(--color-text-secondary)]">{formatarData(arquivo.criadoEm)}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 shrink-0 p-0 text-[var(--color-danger)]"
                onClick={() => deleteMutation.mutate(arquivo.id)}
                aria-label={`Excluir ${arquivo.nome}`}
                title="Excluir"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <UploadDocumentoForm colaboradorId={colaborador!.id} categorias={categorias} categoriaId={categoriaAtualId} />
      <DocumentoPreviewDialog preview={preview} onOpenChange={(open) => !open && fechar()} />
    </div>
  );
}

function UploadDocumentoForm({
  colaboradorId,
  categorias,
  categoriaId: categoriaInicial,
}: {
  colaboradorId: string;
  categorias: { id: string; nome: string }[];
  /** Categoria da pasta atual, se o upload for disparado de dentro dela — só preenche o valor inicial. */
  categoriaId: string;
}) {
  const uploadMutation = useUploadDocumento(colaboradorId);
  const [nome, setNome] = useState('');
  const [categoriaId, setCategoriaId] = useState(categoriaInicial);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    if (!arquivo || !categoriaId) {
      setErro('Selecione a categoria e o arquivo');
      return;
    }
    try {
      await uploadMutation.mutateAsync({ nome: nome || arquivo.name, categoriaId, arquivo });
      setNome('');
      setArquivo(null);
      if (!categoriaInicial) setCategoriaId('');
    } catch {
      setErro('Não foi possível enviar o documento.');
    }
  }

  return (
    <Card elevated className="p-4">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
        <FormField label="Nome (opcional)" htmlFor="central-doc-nome">
          <Input id="central-doc-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do documento" />
        </FormField>
        <FormField label="Categoria" htmlFor="central-doc-categoria">
          <Select id="central-doc-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
            <option value="">— Selecione —</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Arquivo" htmlFor="central-doc-arquivo" error={erro ?? undefined}>
          <Input
            id="central-doc-arquivo"
            type="file"
            accept=".pdf,.doc,.docx,image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </FormField>
        <FormActions>
          <Button type="submit" disabled={uploadMutation.isPending} className="gap-1.5">
            <Upload aria-hidden="true" className="h-4 w-4" />
            Enviar
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
