import { FormEvent, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Eye, EyeOff, FileText, Pencil, Trash2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
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
import { Select } from '../../../components/ui/Select';
import { StatusToggle } from '../../../components/ui/StatusToggle';
import { Table, Td, Th, Tr } from '../../../components/ui/Table';
import type { UserRole } from '../../../types/auth.types';
import { uploadDocumento } from '../../colaboradores-rh/api/colaborador-rh.api';
import { TIPOS_DOCUMENTO, type TipoDocumentoColaborador } from '../../colaboradores-rh/types/colaborador-rh.types';
import { useDepartamentos } from '../../departamentos/hooks/useDepartamentos';
import { useSubAreas } from '../../subareas/hooks/useSubAreas';
import {
  useCreateUsuario,
  useDeactivateUsuario,
  useDeleteUsuarioPermanently,
  useUpdateUsuario,
  useUsuarios,
  useSetStatusUsuario,
} from '../hooks/useUsuarios';
import type {
  CreateUsuarioInput,
  StatusColaborador,
  UpdateUsuarioInput,
  Usuario,
  UsuarioCriado,
} from '../types/usuario.types';
import { STATUS_COLABORADOR } from '../types/usuario.types';

interface FormularioState {
  nome: string;
  email: string;
  senha: string;
  acessoPlataforma: boolean;
  role: UserRole;
  groupId: string;
  subAreaId: string;
  senioridade: string;
  cargo: string;
  gestorId: string;
  salario: string;
  beneficios: string;
  statusColaborador: StatusColaborador;
  bancoNome: string;
  bancoAgencia: string;
  bancoConta: string;
  bancoTipoConta: string;
  dataNascimento: string;
  dataAdmissao: string;
  telefone: string;
  telegramUsername: string;
  telegramChatId: string;
  recebeAvisosRH: boolean;
}

const ABAS_CADASTRO = [
  { id: 'geral', label: 'Geral' },
  { id: 'profissional', label: 'Profissional' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'configuracoes', label: 'Configurações' },
] as const;

type AbaCadastro = typeof ABAS_CADASTRO[number]['id'];

const FORM_VAZIO: FormularioState = {
  nome: '',
  email: '',
  senha: '',
  acessoPlataforma: false,
  role: 'USER',
  groupId: '',
  subAreaId: '',
  senioridade: '',
  cargo: '',
  gestorId: '',
  salario: '',
  beneficios: '',
  statusColaborador: 'ATIVO',
  bancoNome: '',
  bancoAgencia: '',
  bancoConta: '',
  bancoTipoConta: '',
  dataNascimento: '',
  dataAdmissao: '',
  telefone: '',
  telegramUsername: '',
  telegramChatId: '',
  recebeAvisosRH: false,
};

function opcional(valor: string): string | undefined {
  const limpo = valor.trim();
  return limpo === '' ? undefined : limpo;
}

interface DocumentoPendente {
  chave: string;
  arquivo: File;
  tipo: TipoDocumentoColaborador;
}

function chaveDoArquivo(arquivo: File): string {
  return `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}`;
}

export default function ColaboradoresAdminPage() {
  const usuariosQuery = useUsuarios();
  const departamentosQuery = useDepartamentos();
  const createMutation = useCreateUsuario();
  const updateMutation = useUpdateUsuario();
  const deactivateMutation = useDeactivateUsuario();
  const deleteMutation = useDeleteUsuarioPermanently();
  const statusMutation = useSetStatusUsuario();

  const [abaCadastro, setAbaCadastro] = useState<AbaCadastro>('geral');
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'desativados' | 'todos'>('ativos');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Usuario | null>(null);
  const [emEdicao, setEmEdicao] = useState<Usuario | null>(null);
  const [form, setForm] = useState<FormularioState>(FORM_VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null);
  const [documentosPendentes, setDocumentosPendentes] = useState<DocumentoPendente[]>([]);
  const [documentoEnviando, setDocumentoEnviando] = useState(false);

  const departamentos = departamentosQuery.data ?? [];
  const subAreasQuery = useSubAreas({ groupId: form.groupId });
  const subAreas = subAreasQuery.data ?? [];

  const usuariosFiltrados = useMemo(() => {
    const usuarios = usuariosQuery.data ?? [];
    const termo = busca.toLowerCase();
    return usuarios.filter((u) => {
      const statusValido = filtroStatus === 'todos' || (filtroStatus === 'ativos' ? u.ativo : !u.ativo);
      return statusValido && (u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo));
    });
  }, [usuariosQuery.data, busca, filtroStatus]);

  function alterar<K extends keyof FormularioState>(campo: K, valor: FormularioState[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function alterarDepartamento(groupId: string) {
    setForm((atual) => ({ ...atual, groupId, subAreaId: '' }));
  }

  function adicionarDocumentos(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    const novos = Array.from(arquivos).map((arquivo) => ({ chave: chaveDoArquivo(arquivo), arquivo, tipo: 'OUTRO' as TipoDocumentoColaborador }));
    setDocumentosPendentes((atual) => {
      const chavesExistentes = new Set(atual.map((d) => d.chave));
      return [...atual, ...novos.filter((d) => !chavesExistentes.has(d.chave))];
    });
  }

  function removerDocumentoPendente(chave: string) {
    setDocumentosPendentes((atual) => atual.filter((d) => d.chave !== chave));
  }

  function alterarTipoDocumentoPendente(chave: string, tipo: TipoDocumentoColaborador) {
    setDocumentosPendentes((atual) => atual.map((d) => (d.chave === chave ? { ...d, tipo } : d)));
  }

  function abrirNovo() {
    setEmEdicao(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setMostrarSenha(false);
    setAbaCadastro('geral');
    setDocumentosPendentes([]);
    setDialogAberto(true);
  }

  function abrirEdicao(usuario: Usuario) {
    setEmEdicao(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      acessoPlataforma: usuario.acessoPlataforma,
      role: usuario.role,
      groupId: usuario.groupId ?? '',
      subAreaId: usuario.subAreaId ?? '',
      senioridade: usuario.senioridade ?? '',
      cargo: usuario.cargo ?? '',
      gestorId: usuario.gestorId ?? '',
      salario: usuario.salario ?? '',
      beneficios: usuario.beneficios ?? '',
      statusColaborador: usuario.statusColaborador,
      bancoNome: usuario.bancoNome ?? '',
      bancoAgencia: usuario.bancoAgencia ?? '',
      bancoConta: usuario.bancoConta ?? '',
      bancoTipoConta: usuario.bancoTipoConta ?? '',
      dataNascimento: usuario.dataNascimento ? usuario.dataNascimento.slice(0, 10) : '',
      dataAdmissao: usuario.dataAdmissao ? usuario.dataAdmissao.slice(0, 10) : '',
      telefone: usuario.telefone ?? '',
      telegramUsername: usuario.telegramUsername ?? '',
      telegramChatId: usuario.telegramChatId ?? '',
      recebeAvisosRH: usuario.recebeAvisosRH,
    });
    setErro(null);
    setAbaCadastro('geral');
    setDocumentosPendentes([]);
    setDialogAberto(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const invalidField = (event.currentTarget as HTMLFormElement).querySelector<HTMLInputElement | HTMLSelectElement>(':invalid');
    if (invalidField) {
      invalidField.reportValidity();
      invalidField.focus();
      return;
    }
    setErro(null);

    const base = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      role: form.role,
      acessoPlataforma: form.acessoPlataforma,
      groupId: opcional(form.groupId),
      subAreaId: opcional(form.subAreaId),
      senioridade: opcional(form.senioridade),
      cargo: opcional(form.cargo),
      gestorId: opcional(form.gestorId),
      salario: opcional(form.salario),
      beneficios: opcional(form.beneficios),
      statusColaborador: form.statusColaborador,
      bancoNome: opcional(form.bancoNome),
      bancoAgencia: opcional(form.bancoAgencia),
      bancoConta: opcional(form.bancoConta),
      bancoTipoConta: opcional(form.bancoTipoConta),
      dataNascimento: opcional(form.dataNascimento),
      dataAdmissao: opcional(form.dataAdmissao),
      telefone: opcional(form.telefone),
      telegramUsername: form.telegramUsername.trim(),
      telegramChatId: opcional(form.telegramChatId),
      recebeAvisosRH: form.recebeAvisosRH,
    };

    let colaboradorId: string;
    try {
      if (emEdicao) {
        const atualizado = await updateMutation.mutateAsync({
          id: emEdicao.id,
          input: {
            ...base,
            ...(form.acessoPlataforma && !emEdicao.acessoPlataforma ? { senha: opcional(form.senha) } : {}),
          } as UpdateUsuarioInput,
        });
        if (atualizado.senhaGerada) {
          setSenhaGerada({ nome: atualizado.nome, senha: atualizado.senhaGerada });
        }
        colaboradorId = atualizado.id;
      } else {
        const criado: UsuarioCriado = await createMutation.mutateAsync({
          ...base,
          ...(form.acessoPlataforma ? { senha: opcional(form.senha) } : {}),
        } as CreateUsuarioInput);
        if (criado.senhaGerada) {
          setSenhaGerada({ nome: criado.nome, senha: criado.senhaGerada });
        }
        colaboradorId = criado.id;
      }
    } catch {
      setErro('Não foi possível salvar o colaborador.');
      return;
    }

    // O colaborador já está salvo aqui: uma falha em algum anexo não pode
    // parecer que o cadastro inteiro não foi. Por isso o diálogo fecha de
    // todo jeito, e o aviso de falha vai para a lista (que continua
    // visível), não para dentro do diálogo que está se fechando.
    if (documentosPendentes.length > 0) {
      setDocumentoEnviando(true);
      const falhas: string[] = [];
      for (const documento of documentosPendentes) {
        try {
          await uploadDocumento(colaboradorId, {
            nome: documento.arquivo.name,
            tipo: documento.tipo,
            arquivo: documento.arquivo,
          });
        } catch {
          falhas.push(documento.arquivo.name);
        }
      }
      setDocumentoEnviando(false);
      if (falhas.length > 0) {
        setErroLista(
          `${form.nome.trim()} foi salvo, mas não foi possível anexar: ${falhas.join(', ')}. Envie ${falhas.length > 1 ? '-os' : '-o'} depois pela ficha da pessoa.`,
        );
      }
    }

    setDialogAberto(false);
  }

  function handleAlternarStatus(usuario: Usuario) {
    setErroLista(null);
    statusMutation.mutate(
      { id: usuario.id, ativo: !usuario.ativo },
      {
        onError: () => setErroLista(`Não foi possível ${usuario.ativo ? 'desativar' : 'reativar'} o colaborador.`),
      },
    );
  }

  function handleExcluir(usuario: Usuario) {
    setErroLista(null);
    setUsuarioParaExcluir(usuario);
  }

  function confirmarExclusao() {
    if (!usuarioParaExcluir) return;
    setErroLista(null);
    deleteMutation.mutate(usuarioParaExcluir.id, {
      onSuccess: () => setUsuarioParaExcluir(null),
      onError: (error) => {
        setUsuarioParaExcluir(null);
        setErroLista(error instanceof Error ? error.message : 'Não foi possível excluir o colaborador.');
      },
    });
  }

  if (usuariosQuery.isError) {
    return <ErrorState message="Não foi possível carregar os colaboradores." onRetry={() => usuariosQuery.refetch()} />;
  }

  if (usuariosQuery.isLoading) {
    return <LoadingState rows={5} />;
  }

  return (
    <>
      <ListToolbar actions={<Button onClick={abrirNovo}>Novo colaborador</Button>}>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <SearchField value={busca} onChange={setBusca} placeholder="Buscar por nome ou e-mail" />
          <Select
            aria-label="Filtrar colaboradores por status"
            value={filtroStatus}
            onChange={(event) => setFiltroStatus(event.target.value as typeof filtroStatus)}
            className="max-w-[180px]"
          >
            <option value="ativos">Ativos</option>
            <option value="desativados">Desativados</option>
            <option value="todos">Todos</option>
          </Select>
        </div>
      </ListToolbar>

      {erroLista && <p className="pb-4 text-sm text-[var(--color-danger)]">{erroLista}</p>}

      {usuariosFiltrados.length === 0 ? (
        <EmptyState title="Nenhum colaborador encontrado" description="Cadastre o primeiro colaborador." />
      ) : (
        <Card elevated className="overflow-hidden">
          <Table>
            <thead>
              <tr>
                <Th>Nome</Th>
                <Th>E-mail</Th>
                <Th>Departamento</Th>
                <Th>Perfil</Th>
                <Th>Acesso à plataforma</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <Tr key={usuario.id}>
                  <Td className="font-bold text-[var(--color-text-primary)]">{usuario.nome}</Td>
                  <Td>{usuario.email}</Td>
                  <Td>
                    {usuario.group?.nome ?? '—'}
                    {usuario.subArea && (
                      <span className="block text-xs text-[var(--color-text-secondary)]">{usuario.subArea.nome}</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={usuario.role === 'ADMIN' ? 'purple' : 'blue'}>
                      {usuario.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={usuario.acessoPlataforma ? 'blue' : 'neutral'}>
                      {usuario.acessoPlataforma ? 'Com acesso' : 'Sem acesso'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      <Badge tone={usuario.ativo ? 'success' : 'neutral'}>{usuario.ativo ? 'Ativo' : 'Desativado'}</Badge>
                      {usuario.statusColaborador !== 'ATIVO' && (
                        <Badge tone={usuario.statusColaborador === 'DESLIGADO' ? 'danger' : 'warning'}>
                          {STATUS_COLABORADOR.find((s) => s.value === usuario.statusColaborador)?.label}
                        </Badge>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <Link
                        to={`/configuracoes/colaboradores/${usuario.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
                        aria-label={`Ficha completa de ${usuario.nome}`}
                        title="Ficha completa"
                      >
                        <FileText aria-hidden="true" className="h-4 w-4" />
                      </Link>
                      {usuario.ativo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => abrirEdicao(usuario)}
                          aria-label={`Editar ${usuario.nome}`}
                          title="Editar colaborador"
                        >
                          <Pencil aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      )}
                      <StatusToggle
                        checked={usuario.ativo}
                        onChange={() => handleAlternarStatus(usuario)}
                        label={usuario.ativo ? 'Desativar colaborador' : 'Reativar colaborador'}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-[var(--color-danger)]"
                        onClick={() => handleExcluir(usuario)}
                        aria-label={`Excluir ${usuario.nome}`}
                        title="Excluir colaborador permanentemente"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </Button>
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
        title={emEdicao ? 'Editar colaborador' : 'Novo colaborador'}
        className="max-w-5xl"
        fitViewport
      >
        <form
          noValidate
          onSubmit={handleSubmit}
          onInvalidCapture={(event) => {
            const panel = (event.target as HTMLElement).closest<HTMLElement>('[data-aba]');
            if (panel) flushSync(() => setAbaCadastro(panel.dataset.aba as AbaCadastro));
          }}
          className="flex shrink-0 flex-col gap-4"
        >
          <div role="tablist" aria-label="Informações do colaborador" className="flex flex-wrap gap-2">
            {ABAS_CADASTRO.map((aba, index, abas) => (
              <button
                key={aba.id}
                id={`cadastro-tab-${aba.id}`}
                type="button"
                role="tab"
                aria-selected={abaCadastro === aba.id}
                aria-controls={`cadastro-panel-${aba.id}`}
                tabIndex={abaCadastro === aba.id ? 0 : -1}
                onClick={() => setAbaCadastro(aba.id)}
                onKeyDown={(event) => {
                  let next = index;
                  if (event.key === 'ArrowRight') next = (index + 1) % abas.length;
                  else if (event.key === 'ArrowLeft') next = (index - 1 + abas.length) % abas.length;
                  else if (event.key === 'Home') next = 0;
                  else if (event.key === 'End') next = abas.length - 1;
                  else return;
                  event.preventDefault();
                  setAbaCadastro(abas[next].id);
                  document.getElementById(`cadastro-tab-${abas[next].id}`)?.focus();
                }}
                className={`rounded-button border px-4 py-2 text-sm font-bold transition-colors ${
                  abaCadastro === aba.id
                    ? 'border-transparent bg-[var(--color-purple-soft)] text-[var(--color-purple)]'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                {aba.label}
              </button>
            ))}
          </div>

          <div
            id="cadastro-panel-geral"
            role="tabpanel"
            aria-labelledby="cadastro-tab-geral"
            data-aba="geral"
            hidden={abaCadastro !== 'geral'}
            className={abaCadastro === 'geral' ? 'grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 md:grid-cols-3' : 'hidden'}
          >
            <FormField label="Nome" htmlFor="nome">
              <Input id="nome" value={form.nome} onChange={(e) => alterar('nome', e.target.value)} required />
            </FormField>

            <FormField label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => alterar('email', e.target.value)}
                required
              />
            </FormField>

            <FormField label="Telefone" htmlFor="telefone">
              <Input id="telefone" value={form.telefone} onChange={(e) => alterar('telefone', e.target.value)} />
            </FormField>

            <FormField label="Data de nascimento" htmlFor="dataNascimento">
              <Input
                id="dataNascimento"
                type="date"
                value={form.dataNascimento}
                onChange={(e) => alterar('dataNascimento', e.target.value)}
              />
            </FormField>

            <FormField label="Username do Telegram" htmlFor="telegramUsername">
              <Input
                id="telegramUsername"
                value={form.telegramUsername}
                onChange={(e) => alterar('telegramUsername', e.target.value)}
                placeholder="@usuario"
                required
              />
            </FormField>

            <FormField label="Chat ID do Telegram (opcional)" htmlFor="telegramChatId">
              <Input
                id="telegramChatId"
                value={form.telegramChatId}
                onChange={(e) => alterar('telegramChatId', e.target.value)}
                placeholder="Ex.: 123456789 — obtido via @userinfobot no Telegram"
              />
            </FormField>

          </div>

          <div
            id="cadastro-panel-profissional"
            role="tabpanel"
            aria-labelledby="cadastro-tab-profissional"
            data-aba="profissional"
            hidden={abaCadastro !== 'profissional'}
            className={abaCadastro === 'profissional' ? 'grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 md:grid-cols-3' : 'hidden'}
          >
            <FormField label="Departamento" htmlFor="groupId">
              <Select id="groupId" value={form.groupId} onChange={(e) => alterarDepartamento(e.target.value)}>
                <option value="">— Sem departamento —</option>
                {departamentos.map((departamento) => (
                  <option key={departamento.id} value={departamento.id}>
                    {departamento.nome}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Área" htmlFor="subAreaId">
              <Select
                id="subAreaId"
                value={form.subAreaId}
                onChange={(e) => alterar('subAreaId', e.target.value)}
                disabled={!form.groupId || subAreas.length === 0}
              >
                <option value="">— Sem área —</option>
                {subAreas.map((subArea) => (
                  <option key={subArea.id} value={subArea.id}>
                    {subArea.nome}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Cargo" htmlFor="cargo">
              <Input id="cargo" value={form.cargo} onChange={(e) => alterar('cargo', e.target.value)} />
            </FormField>

            <FormField label="Senioridade" htmlFor="senioridade">
              <Input
                id="senioridade"
                value={form.senioridade}
                onChange={(e) => alterar('senioridade', e.target.value)}
                placeholder="Ex: Junior II"
              />
            </FormField>

            <FormField label="Gestor" htmlFor="gestorId">
              <Select id="gestorId" value={form.gestorId} onChange={(e) => alterar('gestorId', e.target.value)}>
                <option value="">— Sem gestor —</option>
                {(usuariosQuery.data ?? [])
                  .filter((u) => u.ativo && u.id !== emEdicao?.id)
                  .map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </option>
                  ))}
              </Select>
            </FormField>

            <FormField label="Status do colaborador" htmlFor="statusColaborador">
              <Select
                id="statusColaborador"
                value={form.statusColaborador}
                onChange={(e) => alterar('statusColaborador', e.target.value as StatusColaborador)}
              >
                {STATUS_COLABORADOR.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Data de admissão" htmlFor="dataAdmissao">
              <Input
                id="dataAdmissao"
                type="date"
                value={form.dataAdmissao}
                onChange={(e) => alterar('dataAdmissao', e.target.value)}
              />
            </FormField>

          </div>

          <div
            id="cadastro-panel-financeiro"
            role="tabpanel"
            aria-labelledby="cadastro-tab-financeiro"
            data-aba="financeiro"
            hidden={abaCadastro !== 'financeiro'}
            className={abaCadastro === 'financeiro' ? 'grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 md:grid-cols-3' : 'hidden'}
          >
            <FormField label="Salário (opcional)" htmlFor="salario">
              <Input
                id="salario"
                type="number"
                step="0.01"
                value={form.salario}
                onChange={(e) => alterar('salario', e.target.value)}
                placeholder="Ex: 5000.00"
              />
            </FormField>

            <FormField label="Benefícios (opcional)" htmlFor="beneficios">
              <Input
                id="beneficios"
                value={form.beneficios}
                onChange={(e) => alterar('beneficios', e.target.value)}
                placeholder="Ex: VR, VT, plano de saúde"
              />
            </FormField>

            <FormField label="Banco" htmlFor="bancoNome">
              <Input id="bancoNome" value={form.bancoNome} onChange={(e) => alterar('bancoNome', e.target.value)} />
            </FormField>

            <FormField label="Agência" htmlFor="bancoAgencia">
              <Input
                id="bancoAgencia"
                value={form.bancoAgencia}
                onChange={(e) => alterar('bancoAgencia', e.target.value)}
              />
            </FormField>

            <FormField label="Conta" htmlFor="bancoConta">
              <Input id="bancoConta" value={form.bancoConta} onChange={(e) => alterar('bancoConta', e.target.value)} />
            </FormField>

            <FormField label="Tipo de conta" htmlFor="bancoTipoConta">
              <Input
                id="bancoTipoConta"
                value={form.bancoTipoConta}
                onChange={(e) => alterar('bancoTipoConta', e.target.value)}
                placeholder="Ex: Corrente"
              />
            </FormField>

          </div>

          <div
            id="cadastro-panel-configuracoes"
            role="tabpanel"
            aria-labelledby="cadastro-tab-configuracoes"
            data-aba="configuracoes"
            hidden={abaCadastro !== 'configuracoes'}
            className={abaCadastro === 'configuracoes' ? 'grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 md:grid-cols-3' : 'hidden'}
          >
            <FormField
              label="Acessará a plataforma?"
              htmlFor="acessoPlataforma"
              hint={form.acessoPlataforma
                ? 'Login liberado conforme o perfil e as permissões.'
                : 'Cadastro disponível para gestão de RH, sem login e sem senha. Ao salvar, qualquer senha existente será removida.'}
            >
              <Select
                id="acessoPlataforma"
                value={String(form.acessoPlataforma)}
                onChange={(e) => {
                  setForm((atual) => ({ ...atual, acessoPlataforma: e.target.value === 'true', senha: '' }));
                  setMostrarSenha(false);
                }}
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </Select>
            </FormField>

            {form.acessoPlataforma && (
              <FormField label="Perfil de acesso" htmlFor="role">
                <Select id="role" value={form.role} onChange={(e) => alterar('role', e.target.value as UserRole)}>
                  <option value="USER">Colaborador</option>
                  <option value="ADMIN">Administrador</option>
                </Select>
              </FormField>
            )}

            {form.acessoPlataforma && (!emEdicao || !emEdicao.acessoPlataforma) && (
              <FormField
                label="Senha (opcional)"
                htmlFor="senha"
                hint="Se deixar em branco, uma senha temporária é gerada automaticamente."
              >
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={(e) => alterar('senha', e.target.value)}
                    minLength={6}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[8px] p-1 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
                  >
                    {mostrarSenha ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormField>
            )}

            <div className="sm:col-span-2 md:col-span-3">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <input
                  type="checkbox"
                  checked={form.recebeAvisosRH}
                  onChange={(e) => alterar('recebeAvisosRH', e.target.checked)}
                />
                Recebe avisos de RH (aniversários e tempo de casa de colaboradores)
              </label>
            </div>

            <FormField
              label="Anexar documentos (opcional)"
              htmlFor="documento-arquivo"
              hint="PDF, DOC ou DOCX. Pode selecionar mais de um arquivo. Contrato, comprovante, termo já assinado..."
              className="sm:col-span-2 md:col-span-3"
            >
              <div className="flex flex-col gap-3">
                <Input
                  id="documento-arquivo"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="max-w-xs"
                  onChange={(e) => {
                    adicionarDocumentos(e.target.files);
                    e.target.value = '';
                  }}
                />
                {documentosPendentes.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {documentosPendentes.map((documento) => (
                      <li
                        key={documento.chave}
                        className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-text-primary)]" title={documento.arquivo.name}>
                          {documento.arquivo.name}
                        </span>
                        <Select
                          value={documento.tipo}
                          onChange={(e) =>
                            alterarTipoDocumentoPendente(documento.chave, e.target.value as TipoDocumentoColaborador)
                          }
                          className="w-48"
                          aria-label={`Tipo do documento ${documento.arquivo.name}`}
                        >
                          {TIPOS_DOCUMENTO.map((opcao) => (
                            <option key={opcao.value} value={opcao.value}>
                              {opcao.label}
                            </option>
                          ))}
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => removerDocumentoPendente(documento.chave)}
                          aria-label={`Remover ${documento.arquivo.name}`}
                          title="Remover arquivo"
                        >
                          <X aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FormField>
          </div>

          {erro && <p className="text-sm text-[var(--color-danger)]">{erro}</p>}

          <FormActions>
            <Button type="button" variant="secondary" onClick={() => setDialogAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending || documentoEnviando}>
              {documentoEnviando ? 'Enviando documento...' : 'Salvar'}
            </Button>
          </FormActions>
        </form>
      </Dialog>

      <Dialog
        open={!!usuarioParaExcluir}
        onOpenChange={(open) => !open && setUsuarioParaExcluir(null)}
        title="Excluir colaborador"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Excluir permanentemente o colaborador <strong>{usuarioParaExcluir?.nome}</strong>? Esta ação não pode ser
            desfeita.
          </p>
          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setUsuarioParaExcluir(null)}
              disabled={deleteMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarExclusao} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir permanentemente'}
            </Button>
          </FormActions>
        </div>
      </Dialog>

      <Dialog
        open={!!senhaGerada}
        onOpenChange={(open) => !open && setSenhaGerada(null)}
        title="Senha temporária gerada"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Nenhuma senha foi definida para <strong>{senhaGerada?.nome}</strong>. Repasse a senha temporária abaixo
            para o colaborador — ele poderá trocá-la depois de entrar.
          </p>
          <p className="rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-center font-mono text-lg font-bold tracking-wide text-[var(--color-text-primary)]">
            {senhaGerada?.senha}
          </p>
          <FormActions>
            <Button type="button" onClick={() => setSenhaGerada(null)}>
              Entendi
            </Button>
          </FormActions>
        </div>
      </Dialog>
    </>
  );
}
