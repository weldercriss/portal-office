import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ColaboradoresAdminPage from './ColaboradoresAdminPage';
import type { Usuario } from '../types/usuario.types';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const deactivateMutation = { mutate: vi.fn() };
const deleteMutation = { mutate: vi.fn(), isPending: false };
const statusMutation = { mutate: vi.fn() };

const usuario: Usuario = {
  id: '1',
  nome: 'Ana Colaboradora',
  email: 'ana@portal-suporte.local',
  role: 'USER',
  groupId: 'g1',
  ativo: true,
  acessoPlataforma: true,
  googleLinkedAt: null,
  criadoEm: '2026-01-01T00:00:00.000Z',
  dataNascimento: null,
  dataAdmissao: null,
  telefone: null,
  telegramUsername: null,
  telegramChatId: null,
  recebeAvisosRH: false,
  subAreaId: null,
  senioridade: null,
  cargo: null,
  gestorId: null,
  salario: null,
  beneficios: null,
  statusColaborador: 'ATIVO',
  bancoNome: null,
  bancoAgencia: null,
  bancoConta: null,
  bancoTipoConta: null,
  group: { id: 'g1', nome: 'Suporte N1', fazPlantao: true },
  subArea: null,
  gestor: null,
};

vi.mock('../hooks/useUsuarios', () => ({
  useUsuarios: () => ({ data: [usuario], isError: false, isLoading: false, refetch: vi.fn() }),
  useCreateUsuario: () => createMutation,
  useUpdateUsuario: () => updateMutation,
  useDeactivateUsuario: () => deactivateMutation,
  useDeleteUsuarioPermanently: () => deleteMutation,
  useSetStatusUsuario: () => statusMutation,
}));

vi.mock('../../departamentos/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({ data: [{ id: 'g1', nome: 'Suporte N1', ativo: true, fazPlantao: true }] }),
}));

vi.mock('../../subareas/hooks/useSubAreas', () => ({
  useSubAreas: () => ({ data: [] }),
}));

const { uploadDocumentoMock } = vi.hoisted(() => ({ uploadDocumentoMock: vi.fn().mockResolvedValue({}) }));
vi.mock('../../colaboradores-rh/api/colaborador-rh.api', () => ({
  uploadDocumento: uploadDocumentoMock,
}));

describe('ColaboradoresAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usuario.acessoPlataforma = true;
    createMutation.mutateAsync.mockResolvedValue({});
    updateMutation.mutateAsync.mockResolvedValue({});
    uploadDocumentoMock.mockResolvedValue({});
  });

  it('renders the users list', () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    expect(screen.getByText('Ana Colaboradora')).toBeInTheDocument();
    expect(screen.getByText('Suporte N1')).toBeInTheDocument();
  });

  it('does not show schedule fields or tab even for departments with shifts', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    expect(screen.getByRole('dialog', { name: 'Novo colaborador' })).toBeInTheDocument();

    expect(screen.queryByText('Adicionar exceção')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Profissional' }));
    await userEvent.selectOptions(screen.getByLabelText('Departamento'), 'g1');
    expect(screen.queryByRole('tab', { name: 'Horários' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Entrada padrão (seg–sex)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Saída padrão (seg–sex)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Possui entrada/saída diferenciada')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Almoço — início')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Almoço — fim')).not.toBeInTheDocument();
  });

  it('defaults to no access and discards a password when switching back to no', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Bia');
    await userEvent.type(screen.getByLabelText('E-mail'), 'bia@example.com');
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@bia_user');
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
    expect(screen.getByLabelText('Acessará a plataforma?')).toHaveValue('false');
    expect(screen.queryByLabelText('Senha (opcional)')).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Acessará a plataforma?'), 'true');
    await userEvent.type(screen.getByLabelText('Senha (opcional)'), 'senha123');
    await userEvent.selectOptions(screen.getByLabelText('Acessará a plataforma?'), 'false');
    expect(screen.queryByLabelText('Senha (opcional)')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ acessoPlataforma: false }));
    expect(createMutation.mutateAsync.mock.calls[0][0]).not.toHaveProperty('senha');
    expect(screen.queryByRole('dialog', { name: 'Senha temporária gerada' })).not.toBeInTheDocument();
  });

  it('allows granting access later and displays the generated credential', async () => {
    usuario.acessoPlataforma = false;
    updateMutation.mutateAsync.mockResolvedValue({ ...usuario, acessoPlataforma: true, senhaGerada: 'temporaria123' });
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    expect(screen.getByText('Sem acesso')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar Ana Colaboradora' }));
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@ana_user');
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
    expect(screen.getByLabelText('Acessará a plataforma?')).toHaveValue('false');
    await userEvent.selectOptions(screen.getByLabelText('Acessará a plataforma?'), 'true');
    expect(screen.getByLabelText('Senha (opcional)')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      id: '1', input: expect.objectContaining({ acessoPlataforma: true }),
    }));
    expect(screen.getByRole('dialog', { name: 'Senha temporária gerada' })).toBeInTheDocument();
    expect(screen.getByText('temporaria123')).toBeVisible();
  });

  it('revokes access on edit without deactivating the collaborator', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Editar Ana Colaboradora' }));
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@ana_user');
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
    expect(screen.getByLabelText('Acessará a plataforma?')).toHaveValue('true');
    await userEvent.selectOptions(screen.getByLabelText('Acessará a plataforma?'), 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    const input = updateMutation.mutateAsync.mock.calls[0][0].input;
    expect(input.acessoPlataforma).toBe(false);
    expect(input).not.toHaveProperty('ativo');
    expect(input).not.toHaveProperty('senha');
  });

  it('preserves values across tabs and saves the complete registration', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Bia');
    await userEvent.type(screen.getByLabelText('E-mail'), 'bia@example.com');
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@bia');
    await userEvent.click(screen.getByRole('tab', { name: 'Financeiro' }));
    expect(screen.getByLabelText('Nome')).not.toBeVisible();
    await userEvent.type(screen.getByLabelText('Salário (opcional)'), '5000');
    await userEvent.type(screen.getByLabelText('Conta'), '1234-5');
    await userEvent.click(screen.getByRole('tab', { name: 'Geral' }));
    expect(screen.getByLabelText('Nome')).toHaveValue('Bia');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      nome: 'Bia', email: 'bia@example.com', telegramUsername: '@bia', salario: '5000', bancoConta: '1234-5',
    }));
  });

  it('opens the tab of the first invalid field and resets the tab when reopened', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
    await userEvent.selectOptions(screen.getByLabelText('Acessará a plataforma?'), 'true');
    await userEvent.type(screen.getByLabelText('Senha (opcional)'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('tab', { name: 'Geral' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Nome')).toHaveFocus();
    expect(createMutation.mutateAsync).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Nome'), 'Bia');
    await userEvent.type(screen.getByLabelText('E-mail'), 'bia@example.com');
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@bia');
    // jsdom does not implement minLength validation, so an invalid email covers native validation.
    await userEvent.clear(screen.getByLabelText('E-mail'));
    await userEvent.type(screen.getByLabelText('E-mail'), 'invalid');
    await userEvent.click(screen.getByRole('tab', { name: 'Financeiro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByLabelText('E-mail')).toHaveFocus();
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    expect(screen.getByRole('tab', { name: 'Geral' })).toHaveAttribute('aria-selected', 'true');
  });

  it('edits a collaborator without sending any removed schedule fields', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Editar Ana Colaboradora' }));
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@ana');
    expect(screen.queryByRole('tab', { name: 'Horários' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(updateMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      id: '1', input: expect.objectContaining({ nome: 'Ana Colaboradora' }),
    }));
    const input = updateMutation.mutateAsync.mock.calls[0][0].input;
    expect(input).not.toHaveProperty('horaEntradaPadrao');
    expect(input).not.toHaveProperty('horaSaidaPadrao');
    expect(input).not.toHaveProperty('horarioExcecoes');
    expect(input).not.toHaveProperty('horarioAlmocoInicio');
    expect(input).not.toHaveProperty('horarioAlmocoFim');
  });

  it('anexa o documento opcional ao colaborador recém-criado', async () => {
    createMutation.mutateAsync.mockResolvedValue({ id: 'novo1', nome: 'Bia' });
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Bia');
    await userEvent.type(screen.getByLabelText('E-mail'), 'bia@example.com');
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@bia');
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));

    const arquivo = new File(['conteudo'], 'contrato.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Anexar documentos (opcional)'), arquivo);
    await userEvent.selectOptions(screen.getByLabelText('Tipo do documento contrato.pdf'), 'CONTRATO');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(uploadDocumentoMock).toHaveBeenCalledWith('novo1', {
      nome: 'contrato.pdf',
      tipo: 'CONTRATO',
      arquivo,
    });
  });

  it('anexa mais de um documento ao colaborador recém-criado', async () => {
    createMutation.mutateAsync.mockResolvedValue({ id: 'novo2', nome: 'Duda' });
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Duda');
    await userEvent.type(screen.getByLabelText('E-mail'), 'duda@example.com');
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@duda');
    await userEvent.click(screen.getByRole('tab', { name: 'Configurações' }));

    const contrato = new File(['conteudo'], 'contrato.pdf', { type: 'application/pdf' });
    const rg = new File(['conteudo'], 'rg.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText('Anexar documentos (opcional)'), [contrato, rg]);

    expect(screen.getByText('contrato.pdf')).toBeInTheDocument();
    expect(screen.getByText('rg.pdf')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remover rg.pdf' }));
    expect(screen.queryByText('rg.pdf')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(uploadDocumentoMock).toHaveBeenCalledTimes(1);
    expect(uploadDocumentoMock).toHaveBeenCalledWith('novo2', {
      nome: 'contrato.pdf',
      tipo: 'OUTRO',
      arquivo: contrato,
    });
  });

  it('não tenta anexar nada quando nenhum arquivo é escolhido', async () => {
    render(<ColaboradoresAdminPage />, { wrapper: MemoryRouter });
    await userEvent.click(screen.getByRole('button', { name: 'Novo colaborador' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Caio');
    await userEvent.type(screen.getByLabelText('E-mail'), 'caio@example.com');
    await userEvent.type(screen.getByLabelText('Username do Telegram'), '@caio');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(uploadDocumentoMock).not.toHaveBeenCalled();
  });
});
