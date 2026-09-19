import { FormEvent, useMemo, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { PageShell } from '../../../components/system/PageShell';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Dialog } from '../../../components/ui/Dialog';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ErrorState } from '../../../components/ui/ErrorState';
import { FormActions, FormField } from '../../../components/ui/Form';
import { Input } from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/LoadingState';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Select } from '../../../components/ui/Select';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useTiposSolicitacao } from '../../tipos-solicitacao/hooks/useTiposSolicitacao';
import { CamposFormularioForm } from '../../../components/system/CamposFormularioForm';
import {
  useAnexarCampoFormulario,
  useAnexarSolicitacao,
  useCancelarSolicitacao,
  useCreateSolicitacao,
  useMinhasSolicitacoes,
} from '../hooks/useSolicitacoes';
import type { Solicitacao, SolicitacaoStatus } from '../types/solicitacao.types';
import { visualizarAnexoSolicitacao } from '../utils/anexo';

const ANEXO_ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

const STATUS_LABEL: Record<SolicitacaoStatus, string> = {
  SOLICITADA: 'Solicitada',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  CANCELADA: 'Cancelada',
};

function toneStatus(status: SolicitacaoStatus) {
  if (status === 'APROVADA') return 'success' as const;
  if (status === 'REJEITADA' || status === 'CANCELADA') return 'danger' as const;
  return 'warning' as const;
}

export default function SolicitacoesPage() {
  const solicitacoesQuery = useMinhasSolicitacoes();
  const tiposQuery = useTiposSolicitacao();
  const createMutation = useCreateSolicitacao();
  const cancelarMutation = useCancelarSolicitacao();
  const anexarMutation = useAnexarSolicitacao();
  const anexarCampoMutation = useAnexarCampoFormulario();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [tipoId, setTipoId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [respostasFormulario, setRespostasFormulario] = useState<Record<string, string>>({});
  const [arquivosFormulario, setArquivosFormulario] = useState<Record<string, File | null>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const tiposDisponiveis = useMemo(
    () => (tiposQuery.data ?? []).filter((t) => t.requerAprovacao),
    [tiposQuery.data],
  );
  const tipoSelecionado = tiposDisponiveis.find((t) => t.id === tipoId);

  function abrirNovo() {
    setTipoId('');
    setDataInicio('');
    setDataFim('');
    setDescricao('');
    setArquivo(null);
    setRespostasFormulario({});
    setArquivosFormulario({});
    setErro(null);
    setDialogAberto(true);
  }

  async function solicitar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      const criada = await createMutation.mutateAsync({
        tipoId,
        dataInicio,
        dataFim: dataFim || undefined,
        descricao: descricao || undefined,
        respostasFormulario: tipoSelecionado?.usaFormulario ? respostasFormulario : undefined,
      });
      if (arquivo) {
        await anexarMutation.mutateAsync({ id: criada.id, arquivo });
      }
      // Sequencial, nunca Promise.all: cada upload faz read-modify-write no mesmo Json.
      for (const [campoId, campoArquivo] of Object.entries(arquivosFormulario)) {
        if (campoArquivo) await anexarCampoMutation.mutateAsync({ id: criada.id, campoId, arquivo: campoArquivo });
      }
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível enviar a solicitação. Verifique os dados informados.');
    }
  }

  async function handleVisualizarAnexo(item: Solicitacao) {
    setErroLista(null);
    try {
      await visualizarAnexoSolicitacao(item.id);
    } catch {
      setErroLista('Não foi possível abrir o anexo.');
    }
  }

  function handleCancelar(solicitacao: Solicitacao) {
    setErroLista(null);
    cancelarMutation.mutate(solicitacao.id, { onError: () => setErroLista('Não foi possível cancelar a solicitação.') });
  }

  if (solicitacoesQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar suas solicitações." onRetry={() => solicitacoesQuery.refetch()} />
      </PageShell>
    );
  }

  if (solicitacoesQuery.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={4} />
      </PageShell>
    );
  }

  const solicitacoes = solicitacoesQuery.data ?? [];
  const enviando = createMutation.isPending || anexarMutation.isPending || anexarCampoMutation.isPending;

  return (
    <PageShell>
      <PageHeader
        title="Solicitações"
        description="Solicite férias, folgas e outros afastamentos, e acompanhe o status de aprovação."
        actions={<Button onClick={abrirNovo}>Nova solicitação</Button>}
      />

      {erroLista && <p className="mb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {solicitacoes.length === 0 ? (
        <EmptyState title="Nenhuma solicitação" description="Solicite férias, folga ou outro afastamento quando quiser." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Tipo</Th>
                <Th>Início</Th>
                <Th>Fim</Th>
                <Th>Status</Th>
                <Th>Descrição</Th>
                <Th>Anexo</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {solicitacoes.map((item) => (
                <Tr key={item.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{item.tipo.nome}</Td>
                  <Td>{item.dataInicio.slice(0, 10)}</Td>
                  <Td>{item.dataFim ? item.dataFim.slice(0, 10) : '—'}</Td>
                  <Td>
                    <Badge tone={toneStatus(item.status)}>{STATUS_LABEL[item.status]}</Badge>
                  </Td>
                  <Td>{item.descricao ?? '—'}</Td>
                  <Td>
                    {item.anexoNome ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 px-2"
                        onClick={() => handleVisualizarAnexo(item)}
                        title={item.anexoNome}
                      >
                        <Paperclip aria-hidden="true" className="h-4 w-4" />
                        <span className="max-w-[140px] truncate">{item.anexoNome}</span>
                      </Button>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      {item.status === 'SOLICITADA' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={cancelarMutation.isPending}
                          onClick={() => handleCancelar(item)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Dialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        title="Nova solicitação"
        className="max-w-3xl"
        fitViewport
      >
        <form onSubmit={solicitar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <FormField label="Tipo" htmlFor="solicitacao-tipo">
              <Select id="solicitacao-tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)} required>
                <option value="">Selecione um tipo</option>
                {tiposDisponiveis.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data de início" htmlFor="solicitacao-inicio">
              <Input
                id="solicitacao-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Data de fim (opcional)" htmlFor="solicitacao-fim">
              <Input id="solicitacao-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </FormField>
            <FormField label="Descrição (opcional)" htmlFor="solicitacao-descricao">
              <Input id="solicitacao-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </FormField>

            {tipoSelecionado?.usaFormulario ? (
              <div className="sm:col-span-2">
                <CamposFormularioForm
                  campos={tipoSelecionado.camposFormulario ?? []}
                  valores={respostasFormulario}
                  onChangeValor={(campoId, valor) => setRespostasFormulario((atual) => ({ ...atual, [campoId]: valor }))}
                  arquivos={arquivosFormulario}
                  onChangeArquivo={(campoId, arquivo) => setArquivosFormulario((atual) => ({ ...atual, [campoId]: arquivo }))}
                />
              </div>
            ) : (
              <FormField
                label="Anexo — imagem ou PDF (opcional)"
                htmlFor="solicitacao-anexo"
                error={erro ?? undefined}
                className="sm:col-span-2"
              >
                <Input
                  id="solicitacao-anexo"
                  type="file"
                  accept={ANEXO_ACCEPT}
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </FormField>
            )}
          </div>
          {tipoSelecionado?.usaFormulario && erro && <p className="text-xs text-[var(--color-danger)]">{erro}</p>}

          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              Enviar solicitação
            </Button>
          </FormActions>
        </form>
      </Dialog>
    </PageShell>
  );
}
