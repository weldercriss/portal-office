import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { HttpError } from '../../../api/httpClient';
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
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { useTurnos } from '../../turnos/hooks/useTurnos';
import { useTiposPlantao } from '../../tipos-plantao/hooks/useTiposPlantao';
import {
  useCreatePlantao,
  useDeletePlantao,
  usePlantoes,
  useRemoveSerie,
  useUpdatePlantao,
} from '../hooks/usePlantoes';
import type { Plantao, PlantaoStatus } from '../types/plantao.types';

const STATUS_LABEL: Record<PlantaoStatus, string> = { RASCUNHO: 'Rascunho', PUBLICADO: 'Publicado' };
const DIAS_SEMANA_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function PlantoesAdminPage() {
  const plantoesQuery = usePlantoes();
  const usuariosQuery = useUsuarios();
  const turnosQuery = useTurnos(true);
  const tiposPlantaoQuery = useTiposPlantao(true);
  const createMutation = useCreatePlantao();
  const updateMutation = useUpdatePlantao();
  const deleteMutation = useDeletePlantao();
  const removeSerieMutation = useRemoveSerie();

  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Plantao | null>(null);
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [userId, setUserId] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [tipoPlantaoId, setTipoPlantaoId] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasSemana, setDiasSemana] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [serieParaExcluir, setSerieParaExcluir] = useState<{ serieId: string; quantidade: number } | null>(null);

  const usuarios = usuariosQuery.data ?? [];
  const turnos = turnosQuery.data ?? [];
  const tiposPlantao = tiposPlantaoQuery.data ?? [];
  const plantonistas = usuarios.filter((u) => u.ativo && u.group?.fazPlantao);

  const tipoSelecionado = tiposPlantao.find((t) => t.id === tipoPlantaoId);
  const mostrarCamposRecorrencia = !emEdicao && !!tipoSelecionado && tipoSelecionado.regra !== 'UNICO';
  const mostrarDiasSemana = mostrarCamposRecorrencia && tipoSelecionado?.regra === 'SEMANAL';

  const plantoesFiltrados = useMemo(() => {
    const plantoes = plantoesQuery.data ?? [];
    const termo = busca.toLowerCase();
    return plantoes.filter(
      (p) =>
        p.data.includes(termo) ||
        (p.nome ?? '').toLowerCase().includes(termo) ||
        (p.user?.nome ?? '').toLowerCase().includes(termo),
    );
  }, [plantoesQuery.data, busca]);

  function abrirNovo() {
    setEmEdicao(null);
    setNome('');
    setData('');
    setUserId('');
    setTurnoId('');
    setTipoPlantaoId('');
    setDataFim('');
    setDiasSemana([]);
    setErro(null);
    setDialogAberto(true);
  }

  function abrirEdicao(plantao: Plantao) {
    setEmEdicao(plantao);
    setNome(plantao.nome ?? '');
    setData(plantao.data.slice(0, 10));
    setUserId(plantao.userId ?? '');
    setTurnoId(plantao.turnoId ?? '');
    setTipoPlantaoId(plantao.tipoPlantaoId ?? '');
    setDataFim('');
    setDiasSemana([]);
    setErro(null);
    setDialogAberto(true);
  }

  function alternarDiaSemana(dia: number) {
    setDiasSemana((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia].sort()));
  }

  async function salvar(status: PlantaoStatus, event?: FormEvent) {
    event?.preventDefault();
    setErro(null);
    try {
      const input = {
        nome: nome || undefined,
        data,
        userId: userId || null,
        status,
        turnoId,
        tipoPlantaoId,
        ...(mostrarCamposRecorrencia ? { dataFim, diasSemana: mostrarDiasSemana ? diasSemana : undefined } : {}),
      };
      if (emEdicao) {
        await updateMutation.mutateAsync({ id: emEdicao.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      setDialogAberto(false);
    } catch (err) {
      if (err instanceof HttpError && err.status === 400) {
        setErro(err.message);
      } else {
        setErro('Não foi possível salvar o plantão.');
      }
    }
  }

  function handleExcluir(plantao: Plantao) {
    setErroLista(null);
    deleteMutation.mutate(plantao.id, {
      onError: () => setErroLista('Não foi possível excluir o plantão.'),
    });
  }

  function confirmarExclusaoSerie() {
    if (!serieParaExcluir) return;
    removeSerieMutation.mutate(serieParaExcluir.serieId, {
      onSuccess: () => setSerieParaExcluir(null),
      onError: () => {
        setSerieParaExcluir(null);
        setErroLista('Não foi possível excluir a série de plantões.');
      },
    });
  }

  if (plantoesQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar os plantões." onRetry={() => plantoesQuery.refetch()} />
      </PageShell>
    );
  }

  if (plantoesQuery.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <PageShell>
      <PageHeader title="Plantões Suporte" description="Gerencie a escala de plantões e os plantonistas vinculados." />

      <ListToolbar actions={<Button onClick={abrirNovo}>Novo plantão</Button>}>
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por data, nome ou plantonista" />
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {plantoesFiltrados.length === 0 ? (
        <EmptyState title="Nenhum plantão encontrado" description="Cadastre o primeiro plantão." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Data</Th>
                <Th>Nome</Th>
                <Th>Atendente</Th>
                <Th>Turno</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {plantoesFiltrados.map((plantao) => {
                const qtdSerie = plantao.serieId
                  ? plantoesFiltrados.filter((p) => p.serieId === plantao.serieId).length
                  : 0;
                return (
                  <Tr key={plantao.id}>
                    <Td className="font-bold text-[var(--color-text-primary)]">{plantao.data.slice(0, 10)}</Td>
                    <Td>{plantao.nome ?? '—'}</Td>
                    <Td>{plantao.user?.nome ?? '—'}</Td>
                    <Td>{plantao.turno?.nome ?? '—'}</Td>
                    <Td>{plantao.tipoPlantao?.nome ?? '—'}</Td>
                    <Td>
                      <Badge tone={plantao.status === 'PUBLICADO' ? 'success' : 'neutral'}>
                        {STATUS_LABEL[plantao.status]}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => abrirEdicao(plantao)}
                          aria-label={`Editar plantão ${plantao.nome ?? plantao.data}`}
                          title="Editar plantão"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[var(--color-danger)]"
                          onClick={() => handleExcluir(plantao)}
                          aria-label={`Excluir plantão ${plantao.nome ?? plantao.data}`}
                          title="Excluir plantão"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                        {plantao.serieId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-[var(--color-danger)]"
                            onClick={() => setSerieParaExcluir({ serieId: plantao.serieId as string, quantidade: qtdSerie })}
                            title="Excluir toda a série de plantões"
                          >
                            Excluir série
                          </Button>
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

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto} title={emEdicao ? 'Editar plantão' : 'Novo plantão'}>
        <form onSubmit={(event) => salvar(emEdicao?.status ?? 'RASCUNHO', event)} className="flex flex-col gap-4">
          <FormField label={mostrarCamposRecorrencia ? 'Data de início' : 'Data do plantão'} htmlFor="data-plantao">
            <Input id="data-plantao" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </FormField>
          <FormField label="Nome (opcional)" htmlFor="nome-plantao">
            <Input id="nome-plantao" value={nome} onChange={(e) => setNome(e.target.value)} />
          </FormField>
          <FormField label="Turno" htmlFor="turno-plantao">
            <Select id="turno-plantao" value={turnoId} onChange={(e) => setTurnoId(e.target.value)} required>
              <option value="">Selecione um turno</option>
              {turnos
                .filter((t) => t.ativo)
                .map((turno) => (
                  <option key={turno.id} value={turno.id}>
                    {turno.nome} ({turno.horaInicio}-{turno.horaFim})
                  </option>
                ))}
            </Select>
          </FormField>
          <FormField label="Tipo de plantão" htmlFor="tipo-plantao">
            <Select id="tipo-plantao" value={tipoPlantaoId} onChange={(e) => setTipoPlantaoId(e.target.value)} required>
              <option value="">Selecione um tipo</option>
              {tiposPlantao
                .filter((t) => t.ativo)
                .map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
            </Select>
          </FormField>

          {mostrarCamposRecorrencia && (
            <FormField label="Data final da recorrência" htmlFor="data-fim-plantao">
              <Input
                id="data-fim-plantao"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </FormField>
          )}

          {mostrarDiasSemana && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-[var(--color-text-primary)]">Dias da semana</span>
              <div className="flex flex-wrap gap-3">
                {DIAS_SEMANA_LABEL.map((label, dia) => (
                  <label key={dia} className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                    <input type="checkbox" checked={diasSemana.includes(dia)} onChange={() => alternarDiaSemana(dia)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <FormField label="Atendente / substituto" htmlFor="atendente-plantao" error={erro ?? undefined}>
            <Select id="atendente-plantao" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Sem plantonista vinculado</option>
              {plantonistas.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nome}
                </option>
              ))}
            </Select>
          </FormField>
          <FormActions>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => salvar('RASCUNHO')}>
              Salvar rascunho
            </Button>
            <Button type="button" disabled={pending} onClick={() => salvar('PUBLICADO')}>
              Publicar
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog
        open={!!serieParaExcluir}
        onOpenChange={(open) => !open && setSerieParaExcluir(null)}
        title="Excluir série de plantões"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir os {serieParaExcluir?.quantidade} plantões desta série? Esta ação não pode ser desfeita.
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSerieParaExcluir(null)}
              disabled={removeSerieMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmarExclusaoSerie}
              disabled={removeSerieMutation.isPending}
            >
              {removeSerieMutation.isPending ? 'Excluindo...' : 'Excluir série'}
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </PageShell>
  );
}
