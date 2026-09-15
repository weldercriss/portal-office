import { FormEvent, useMemo, useState } from 'react';
import { Check, FileText, Paperclip, Pencil, Settings, Trash2, X } from 'lucide-react';
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
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import { useTiposSolicitacao } from '../../tipos-solicitacao/hooks/useTiposSolicitacao';
import { useUsuarios } from '../../usuarios/hooks/useUsuarios';
import { CamposFormularioForm } from '../components/CamposFormularioForm';
import { RespostasFormularioDialog } from '../components/RespostasFormularioDialog';
import {
  useAnexarCampoFormulario,
  useAnexarSolicitacao,
  useAprovarSolicitacao,
  useCreateSolicitacao,
  useDeleteSolicitacao,
  useRejeitarSolicitacao,
  useSolicitacoes,
  useUpdateSolicitacao,
} from '../hooks/useSolicitacoes';
import type { Solicitacao, SolicitacaoStatus } from '../types/solicitacao.types';
import { visualizarAnexoSolicitacao } from '../utils/anexo';
import { nomeExibidoSolicitacao } from '../utils/nomeSolicitante';

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

export default function SolicitacoesAdminPage() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState('');
  const [dataDeFiltro, setDataDeFiltro] = useState('');
  const [dataAteFiltro, setDataAteFiltro] = useState('');

  const solicitacoesQuery = useSolicitacoes({
    tipoId: tipoFiltro || undefined,
    from: dataDeFiltro || undefined,
    to: dataAteFiltro || undefined,
  });
  const usuariosQuery = useUsuarios();
  const tiposQuery = useTiposSolicitacao();
  const createMutation = useCreateSolicitacao();
  const updateMutation = useUpdateSolicitacao();
  const aprovarMutation = useAprovarSolicitacao();
  const rejeitarMutation = useRejeitarSolicitacao();
  const deleteMutation = useDeleteSolicitacao();
  const anexarMutation = useAnexarSolicitacao();
  const anexarCampoMutation = useAnexarCampoFormulario();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Solicitacao | null>(null);
  const [respostasAberta, setRespostasAberta] = useState<Solicitacao | null>(null);
  const [userId, setUserId] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [tipoId, setTipoId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [descricao, setDescricao] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [respostasFormulario, setRespostasFormulario] = useState<Record<string, string>>({});
  const [arquivosFormulario, setArquivosFormulario] = useState<Record<string, File | null>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);

  const usuarios = usuariosQuery.data ?? [];
  const tipos = tiposQuery.data ?? [];
  const tipoSelecionado = tipos.find((t) => t.id === tipoId);
  // Tipos com formulário são preenchidos pelo colaborador (tela dele ou link público),
  // não manualmente pelo admin — só entram no seletor ao criar uma solicitação nova.
  const tiposParaCriar = emEdicao ? tipos : tipos.filter((t) => !t.usaFormulario);

  const solicitacoesFiltradas = useMemo(() => {
    const lista = solicitacoesQuery.data ?? [];
    const termo = busca.toLowerCase();
    return lista.filter((item) => (item.user?.nome ?? '').toLowerCase().includes(termo));
  }, [solicitacoesQuery.data, busca]);

  function abrirNovo() {
    setEmEdicao(null);
    setUserId('');
    setResponsavelId('');
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

  function abrirEdicao(solicitacao: Solicitacao) {
    setEmEdicao(solicitacao);
    setUserId(solicitacao.userId ?? '');
    setResponsavelId(solicitacao.responsavelId ?? '');
    setTipoId(solicitacao.tipoId);
    setDataInicio(solicitacao.dataInicio.slice(0, 10));
    setDataFim(solicitacao.dataFim ? solicitacao.dataFim.slice(0, 10) : '');
    setDescricao(solicitacao.descricao ?? '');
    setArquivo(null);
    const valoresIniciais: Record<string, string> = {};
    for (const [chave, valor] of Object.entries(solicitacao.respostasFormulario ?? {})) {
      if (typeof valor === 'string') valoresIniciais[chave] = valor;
    }
    setRespostasFormulario(valoresIniciais);
    setArquivosFormulario({});
    setErro(null);
    setDialogAberto(true);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    try {
      const input = {
        userId,
        responsavelId: responsavelId || null,
        tipoId,
        dataInicio,
        dataFim: dataFim || undefined,
        descricao: descricao || undefined,
        respostasFormulario: tipoSelecionado?.usaFormulario ? respostasFormulario : undefined,
      };
      const solicitacao = emEdicao
        ? await updateMutation.mutateAsync({ id: emEdicao.id, input })
        : await createMutation.mutateAsync(input);
      if (arquivo) {
        await anexarMutation.mutateAsync({ id: solicitacao.id, arquivo });
      }
      for (const [campoId, campoArquivo] of Object.entries(arquivosFormulario)) {
        if (campoArquivo) await anexarCampoMutation.mutateAsync({ id: solicitacao.id, campoId, arquivo: campoArquivo });
      }
      setDialogAberto(false);
    } catch {
      setErro('Não foi possível salvar a solicitação.');
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

  function handleAprovar(solicitacao: Solicitacao) {
    setErroLista(null);
    aprovarMutation.mutate(solicitacao.id, { onError: () => setErroLista('Não foi possível aprovar a solicitação.') });
  }

  function handleRejeitar(solicitacao: Solicitacao) {
    setErroLista(null);
    rejeitarMutation.mutate(solicitacao.id, { onError: () => setErroLista('Não foi possível rejeitar a solicitação.') });
  }

  function handleExcluir(solicitacao: Solicitacao) {
    setErroLista(null);
    deleteMutation.mutate(solicitacao.id, { onError: () => setErroLista('Não foi possível excluir a solicitação.') });
  }

  if (solicitacoesQuery.isError) {
    return (
      <PageShell>
        <ErrorState message="Não foi possível carregar as solicitações." onRetry={() => solicitacoesQuery.refetch()} />
      </PageShell>
    );
  }

  if (solicitacoesQuery.isLoading) {
    return (
      <PageShell>
        <LoadingState rows={5} />
      </PageShell>
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending || anexarMutation.isPending || anexarCampoMutation.isPending;

  return (
    <PageShell>
      <PageHeader title="Solicitações" description="Gerencie as solicitações de férias, folgas e outros afastamentos dos colaboradores." />

      <ListToolbar
        actions={
          <>
            <Button variant="secondary" className="gap-1.5" onClick={() => navigate('/configuracoes/tipos-solicitacao')}>
              <Settings aria-hidden="true" className="h-4 w-4" />
              Configurar tipos
            </Button>
            <Button onClick={abrirNovo}>Nova solicitação</Button>
          </>
        }
      >
        <SearchField value={busca} onChange={setBusca} placeholder="Buscar por colaborador" />
        <Select
          aria-label="Filtrar solicitações por tipo"
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          className="max-w-[200px]"
        >
          <option value="">Todos os tipos</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nome}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="Data de início do filtro"
          value={dataDeFiltro}
          onChange={(e) => setDataDeFiltro(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          type="date"
          aria-label="Data de fim do filtro"
          value={dataAteFiltro}
          onChange={(e) => setDataAteFiltro(e.target.value)}
          className="max-w-[160px]"
        />
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {solicitacoesFiltradas.length === 0 ? (
        <EmptyState title="Nenhuma solicitação encontrada" description="Registre a primeira solicitação de um colaborador." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Colaborador</Th>
                <Th>Responsável</Th>
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
              {solicitacoesFiltradas.map((item) => {
                const nomeExibido = nomeExibidoSolicitacao(item);
                return (
                <Tr key={item.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{nomeExibido}</Td>
                  <Td>{item.responsavel?.nome ?? '—'}</Td>
                  <Td>{item.tipo.nome}</Td>
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
                      {item.tipo.usaFormulario && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setRespostasAberta(item)}
                          aria-label={`Ver respostas do formulário de ${nomeExibido}`}
                          title="Ver respostas do formulário"
                        >
                          <FileText aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      )}
                      {item.tipo.requerAprovacao && item.status === 'SOLICITADA' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[var(--color-danger)]"
                            disabled={rejeitarMutation.isPending}
                            onClick={() => handleRejeitar(item)}
                            aria-label={`Rejeitar solicitação de ${nomeExibido}`}
                            title="Rejeitar solicitação"
                          >
                            <X aria-hidden="true" className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[var(--color-success)]"
                            disabled={aprovarMutation.isPending}
                            onClick={() => handleAprovar(item)}
                            aria-label={`Aprovar solicitação de ${nomeExibido}`}
                            title="Aprovar solicitação"
                          >
                            <Check aria-hidden="true" className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {!item.tipo.requerAprovacao && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => abrirEdicao(item)}
                          aria-label={`Editar solicitação de ${nomeExibido}`}
                          title="Editar solicitação"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => handleExcluir(item)}
                        aria-label={`Excluir solicitação de ${nomeExibido}`}
                        title="Excluir solicitação"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
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
        title={emEdicao ? 'Editar solicitação' : 'Nova solicitação'}
        className="max-w-2xl"
      >
        <form onSubmit={salvar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <FormField label="Colaborador" htmlFor="solicitacao-admin-usuario">
              <Select id="solicitacao-admin-usuario" value={userId} onChange={(e) => setUserId(e.target.value)} required>
                <option value="">Selecione um colaborador</option>
                {usuarios
                  .filter((u) => u.ativo)
                  .map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </option>
                  ))}
              </Select>
            </FormField>
            <FormField label="Tipo" htmlFor="solicitacao-admin-tipo">
              <Select id="solicitacao-admin-tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)} required>
                <option value="">Selecione um tipo</option>
                {tiposParaCriar.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Data de início" htmlFor="solicitacao-admin-inicio">
              <Input
                id="solicitacao-admin-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Data de fim (opcional)" htmlFor="solicitacao-admin-fim">
              <Input id="solicitacao-admin-fim" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </FormField>
            <FormField label="Responsável (opcional)" htmlFor="solicitacao-admin-responsavel" className="sm:col-span-2">
              <Select
                id="solicitacao-admin-responsavel"
                value={responsavelId}
                onChange={(e) => setResponsavelId(e.target.value)}
              >
                <option value="">Sem responsável</option>
                {emEdicao?.responsavel && !usuarios.some((u) => u.ativo && u.id === emEdicao.responsavelId) && (
                  <option value={emEdicao.responsavel.id}>{emEdicao.responsavel.nome} (atual)</option>
                )}
                {usuarios.filter((u) => u.ativo).map((usuario) => (
                  <option key={usuario.id} value={usuario.id}>{usuario.nome}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Descrição (opcional)" htmlFor="solicitacao-admin-descricao" className="sm:col-span-2">
              <Input id="solicitacao-admin-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            </FormField>

            {tipoSelecionado?.usaFormulario ? (
              <div className="sm:col-span-2">
                <CamposFormularioForm
                  campos={tipoSelecionado.camposFormulario ?? []}
                  valores={respostasFormulario}
                  onChangeValor={(campoId, valor) => setRespostasFormulario((atual) => ({ ...atual, [campoId]: valor }))}
                  arquivos={arquivosFormulario}
                  onChangeArquivo={(campoId, arquivo) => setArquivosFormulario((atual) => ({ ...atual, [campoId]: arquivo }))}
                  anexosAtuais={Object.fromEntries(
                    Object.entries(emEdicao?.respostasFormulario ?? {}).map(([chave, valor]) => [
                      chave,
                      typeof valor === 'object' && valor && 'nome' in valor ? valor.nome : undefined,
                    ]),
                  )}
                />
              </div>
            ) : (
              <FormField
                label="Anexo — imagem ou PDF (opcional)"
                htmlFor="solicitacao-admin-anexo"
                error={erro ?? undefined}
                className="sm:col-span-2"
              >
                <Input
                  id="solicitacao-admin-anexo"
                  type="file"
                  accept={ANEXO_ACCEPT}
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </FormField>
            )}
          </div>
          {tipoSelecionado?.usaFormulario && erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}
          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <RespostasFormularioDialog solicitacao={respostasAberta} onOpenChange={(open) => !open && setRespostasAberta(null)} />
    </PageShell>
  );
}
