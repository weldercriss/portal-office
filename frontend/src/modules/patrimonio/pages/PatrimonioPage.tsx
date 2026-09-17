import { FormEvent, useMemo, useState } from 'react';
import { Link2, Pencil, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageShell } from '../../../components/system/PageShell';
import { ListToolbar } from '../../../components/system/ListToolbar';
import { SearchField } from '../../../components/system/SearchField';
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
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useAuth } from '../../../shared/auth/AuthContext';
import { satisfazRole } from '../../../types/auth.types';
import { VinculoDialog } from '../components/VinculoDialog';
import { VinculoLoteDialog } from '../components/VinculoLoteDialog';
import {
  useCreateEquipamento,
  useDeactivateEquipamento,
  useDeleteEquipamentoPermanently,
  useEquipamentos,
  useResumoEquipamentos,
  useTiposEquipamento,
  useUpdateEquipamento,
} from '../hooks/usePatrimonio';
import {
  EQUIPAMENTO_STATUS_LABEL,
  ESTADO_EQUIPAMENTO_LABEL,
  type EquipamentoStatus,
  type EstadoEquipamento,
  type Equipamento,
} from '../types/patrimonio.types';

function toneEstado(estado: EstadoEquipamento) {
  if (estado === 'NOVO' || estado === 'BOM') return 'success' as const;
  if (estado === 'REGULAR') return 'warning' as const;
  return 'danger' as const;
}

function toneStatus(status: EquipamentoStatus) {
  if (status === 'ESTOQUE') return 'blue' as const;
  if (status === 'EM_USO') return 'success' as const;
  if (status === 'MANUTENCAO' || status === 'BAIXADO') return 'danger' as const;
  return 'warning' as const;
}

function identificacao(eq: Equipamento) {
  return [eq.numero && `Pat. ${eq.numero}`, eq.numeroSerie && `Série ${eq.numeroSerie}`, eq.marca, eq.modelo]
    .filter(Boolean)
    .join(' · ') || '—';
}

const CAMPO_VAZIO = '';

export default function PatrimonioPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = satisfazRole(user?.role, 'ADMIN');

  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [somenteDisponiveis, setSomenteDisponiveis] = useState(false);

  const equipamentosQuery = useEquipamentos({
    busca: busca || undefined,
    tipoId: tipoFiltro || undefined,
    status: statusFiltro || undefined,
    estado: estadoFiltro || undefined,
    disponiveis: somenteDisponiveis || undefined,
    all: true,
  });
  const resumoQuery = useResumoEquipamentos();
  const tiposQuery = useTiposEquipamento(true);
  const createMutation = useCreateEquipamento();
  const updateMutation = useUpdateEquipamento();
  const deactivateMutation = useDeactivateEquipamento();
  const deleteMutation = useDeleteEquipamentoPermanently();

  const tipos = tiposQuery.data ?? [];

  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Equipamento | null>(null);
  const [tipoId, setTipoId] = useState('');
  const [numero, setNumero] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [estado, setEstado] = useState<EstadoEquipamento | ''>('');
  const [status, setStatus] = useState<EquipamentoStatus | ''>('');
  const [dataAquisicao, setDataAquisicao] = useState('');
  const [valorAquisicao, setValorAquisicao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [equipamentoParaExcluir, setEquipamentoParaExcluir] = useState<Equipamento | null>(null);
  const [vinculoAlvo, setVinculoAlvo] = useState<Equipamento | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [vinculoLoteAberto, setVinculoLoteAberto] = useState(false);

  const equipamentos = useMemo(() => equipamentosQuery.data ?? [], [equipamentosQuery.data]);
  const equipamentosSelecionados = useMemo(
    () => equipamentos.filter((eq) => selecionados.has(eq.id)),
    [equipamentos, selecionados],
  );

  function alternarSelecao(id: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  function abrirNovo() {
    setEmEdicao(null);
    setTipoId('');
    setNumero(CAMPO_VAZIO);
    setNumeroSerie(CAMPO_VAZIO);
    setMarca(CAMPO_VAZIO);
    setModelo(CAMPO_VAZIO);
    setEstado('');
    setStatus('');
    setDataAquisicao('');
    setValorAquisicao('');
    setObservacoes(CAMPO_VAZIO);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(eq: Equipamento) {
    setEmEdicao(eq);
    setTipoId(eq.tipoId);
    setNumero(eq.numero ?? '');
    setNumeroSerie(eq.numeroSerie ?? '');
    setMarca(eq.marca ?? '');
    setModelo(eq.modelo ?? '');
    setEstado(eq.estado);
    setStatus(eq.status);
    setDataAquisicao(eq.dataAquisicao ? eq.dataAquisicao.slice(0, 10) : '');
    setValorAquisicao(eq.valorAquisicao ?? '');
    setObservacoes(eq.observacoes ?? '');
    setErro(null);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    const input = {
      tipoId,
      numero,
      numeroSerie,
      marca,
      modelo,
      estado: estado || undefined,
      status: status || undefined,
      dataAquisicao: dataAquisicao || undefined,
      valorAquisicao: valorAquisicao === '' ? null : Number(valorAquisicao),
      observacoes,
    };
    try {
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogAberto(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar o equipamento.');
    }
  }

  function handleAlternarStatus(eq: Equipamento) {
    setErroLista(null);
    if (eq.ativo) {
      deactivateMutation.mutate(eq.id, {
        onError: (error) => setErroLista(error instanceof Error ? error.message : 'Não foi possível desativar o equipamento.'),
      });
    } else {
      updateMutation.mutate(
        { id: eq.id, input: { ativo: true } },
        { onError: () => setErroLista('Não foi possível reativar o equipamento.') },
      );
    }
  }

  function confirmarExclusao() {
    if (!equipamentoParaExcluir) return;
    deleteMutation.mutate(equipamentoParaExcluir.id, {
      onSuccess: () => setEquipamentoParaExcluir(null),
      onError: (error) => {
        setEquipamentoParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir o equipamento.');
      },
    });
  }

  if (equipamentosQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar o inventário." onRetry={() => equipamentosQuery.refetch()} />
      </PageShell>
    );
  }

  const resumo = resumoQuery.data;

  return (
    <PageShell>
      <PageHeader
        title="Bens e equipamentos"
        description="Cadastre o inventário de equipamentos e vincule-os aos colaboradores responsáveis."
        actions={
          isAdmin ? (
            <>
              <Button variant="secondary" className="gap-1.5" onClick={() => navigate('/configuracoes/tipos-equipamento')}>
                <Settings aria-hidden="true" className="h-4 w-4" />
                Configurar tipos
              </Button>
              <Button onClick={abrirNovo}>Novo equipamento</Button>
            </>
          ) : undefined
        }
      />

      {resumo && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(Object.entries(EQUIPAMENTO_STATUS_LABEL) as [EquipamentoStatus, string][]).map(([valor, label]) => (
            <Card key={valor} className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
              <p className="mt-1 text-2xl font-bold text-[var(--color-text-primary)]">{resumo.porStatus[valor]}</p>
            </Card>
          ))}
        </div>
      )}

      <ListToolbar>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por patrimônio, série, marca ou modelo" />
        <Select aria-label="Filtrar por tipo" value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="max-w-[180px]">
          <option value="">Todos os tipos</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por situação" value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="max-w-[180px]">
          <option value="">Todas as situações</option>
          {Object.entries(EQUIPAMENTO_STATUS_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por conservação" value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)} className="max-w-[160px]">
          <option value="">Toda conservação</option>
          {Object.entries(ESTADO_EQUIPAMENTO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={somenteDisponiveis} onChange={(e) => setSomenteDisponiveis(e.target.checked)} />
          Somente disponíveis
        </label>
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {isAdmin && selecionados.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-card bg-[var(--color-surface-muted)] px-4 py-3">
          <span className="text-sm text-[var(--color-text-secondary)]">{selecionados.size} equipamento(s) selecionado(s)</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelecionados(new Set())}>
              Limpar seleção
            </Button>
            <Button size="sm" onClick={() => setVinculoLoteAberto(true)}>
              Vincular selecionados
            </Button>
          </div>
        </div>
      )}

      {equipamentosQuery.isLoading ? (
        <LoadingState rows={5} />
      ) : equipamentos.length === 0 ? (
        <EmptyState title="Nenhum equipamento encontrado" description="Cadastre o primeiro bem do inventário." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                {isAdmin && <Th className="w-10" />}
                <Th>Tipo</Th>
                <Th>Identificação</Th>
                <Th>Conservação</Th>
                <Th>Situação</Th>
                <Th>Colaborador</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {equipamentos.map((eq) => {
                const vinculo = eq.alocacoes[0];
                const podeVincular = eq.ativo && eq.status === 'ESTOQUE' && !vinculo;
                return (
                  <Tr key={eq.id} className={eq.ativo ? undefined : 'opacity-60'}>
                    {isAdmin && (
                      <Td>
                        {podeVincular && (
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${eq.tipo.nome}`}
                            checked={selecionados.has(eq.id)}
                            onChange={() => alternarSelecao(eq.id)}
                          />
                        )}
                      </Td>
                    )}
                    <Td className="font-bold text-[var(--color-text-primary)]">{eq.tipo.nome}</Td>
                    <Td>{identificacao(eq)}</Td>
                    <Td>
                      <Badge tone={toneEstado(eq.estado)}>{ESTADO_EQUIPAMENTO_LABEL[eq.estado]}</Badge>
                    </Td>
                    <Td>
                      <Badge tone={toneStatus(eq.status)}>{EQUIPAMENTO_STATUS_LABEL[eq.status]}</Badge>
                    </Td>
                    <Td>{vinculo?.colaborador.nome || '—'}</Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {isAdmin && (vinculo || podeVincular) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1 px-2"
                            onClick={() => setVinculoAlvo(eq)}
                            title={vinculo ? 'Ver vínculo' : 'Vincular a colaborador'}
                          >
                            <Link2 aria-hidden="true" className="h-4 w-4" />
                            {vinculo ? 'Vínculo' : 'Vincular'}
                          </Button>
                        )}
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => abrirEdicao(eq)}
                              aria-label={`Editar ${eq.tipo.nome}`}
                              title="Editar equipamento"
                            >
                              <Pencil aria-hidden="true" className="h-4 w-4" />
                            </Button>
                            <StatusToggle
                              checked={eq.ativo}
                              onChange={() => handleAlternarStatus(eq)}
                              label={eq.ativo ? 'Desativar equipamento' : 'Reativar equipamento'}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[var(--color-danger)]"
                              onClick={() => setEquipamentoParaExcluir(eq)}
                              aria-label={`Excluir ${eq.tipo.nome}`}
                              title="Excluir equipamento permanentemente"
                            >
                              <Trash2 aria-hidden="true" className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <Dialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        title={emEdicao ? 'Editar equipamento' : 'Novo equipamento'}
        className="max-w-4xl"
        fitViewport
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Tipo" htmlFor="equipamento-tipo" error={erro ?? undefined}>
              <Select id="equipamento-tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)} required>
                <option value="">Selecione...</option>
                {tipos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                    {!tipo.ativo && ' (inativo)'}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Número de patrimônio" htmlFor="equipamento-numero" hint="Opcional">
              <Input id="equipamento-numero" value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={60} />
            </FormField>
            <FormField label="Número de série" htmlFor="equipamento-serie" hint="Opcional">
              <Input id="equipamento-serie" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} maxLength={80} />
            </FormField>
            <FormField label="Marca" htmlFor="equipamento-marca" hint="Opcional">
              <Input id="equipamento-marca" value={marca} onChange={(e) => setMarca(e.target.value)} maxLength={80} />
            </FormField>
            <FormField label="Modelo" htmlFor="equipamento-modelo" hint="Opcional">
              <Input id="equipamento-modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} maxLength={80} />
            </FormField>
            <FormField label="Conservação" htmlFor="equipamento-estado">
              <Select id="equipamento-estado" value={estado} onChange={(e) => setEstado(e.target.value as EstadoEquipamento)}>
                <option value="">Padrão (Novo)</option>
                {Object.entries(ESTADO_EQUIPAMENTO_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label="Situação"
              htmlFor="equipamento-status"
              hint={emEdicao?.alocacoes.length ? 'Com colaborador: devolva antes de mudar a situação' : undefined}
            >
              <Select
                id="equipamento-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipamentoStatus)}
                disabled={!!emEdicao?.alocacoes.length}
              >
                <option value="">Padrão (Estoque)</option>
                {Object.entries(EQUIPAMENTO_STATUS_LABEL).map(([valor, label]) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data de aquisição" htmlFor="equipamento-data-aquisicao" hint="Opcional">
              <Input id="equipamento-data-aquisicao" type="date" value={dataAquisicao} onChange={(e) => setDataAquisicao(e.target.value)} />
            </FormField>
            <FormField label="Valor de aquisição" htmlFor="equipamento-valor" hint="Opcional">
              <Input
                id="equipamento-valor"
                type="number"
                min={0}
                step="0.01"
                value={valorAquisicao}
                onChange={(e) => setValorAquisicao(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Observações" htmlFor="equipamento-observacoes" hint="Opcional">
            <Input id="equipamento-observacoes" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} maxLength={500} />
          </FormField>

          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              Salvar
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog open={!!equipamentoParaExcluir} onOpenChange={(open) => !open && setEquipamentoParaExcluir(null)} title="Excluir equipamento">
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente {equipamentoParaExcluir ? identificacao(equipamentoParaExcluir) : ''}?
          </p>
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setEquipamentoParaExcluir(null)} disabled={deleteMutation.isPending}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarExclusao} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </FormActions>
        </div>
      </Dialog>

      <VinculoDialog open={!!vinculoAlvo} onOpenChange={(open) => !open && setVinculoAlvo(null)} equipamento={vinculoAlvo} />

      <VinculoLoteDialog
        open={vinculoLoteAberto}
        onOpenChange={setVinculoLoteAberto}
        equipamentos={equipamentosSelecionados}
        onConcluido={() => {
          setVinculoLoteAberto(false);
          setSelecionados(new Set());
        }}
      />
    </PageShell>
  );
}
