import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PatrimonioPage from './PatrimonioPage';
import type { Equipamento, TipoEquipamento } from '../types/patrimonio.types';

const createEquipamentoMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateEquipamentoMutation = { mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const deactivateEquipamentoMutation = { mutate: vi.fn(), isPending: false };
const deleteEquipamentoMutation = { mutate: vi.fn(), isPending: false };
const createAlocacaoMutation = { mutateAsync: vi.fn().mockResolvedValue({ id: 'aloc-novo' }), isPending: false };
const anexarTermoLoteMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };

const tipo: TipoEquipamento = {
  id: 'tipo1',
  nome: 'Notebook',
  descricao: null,
  exigeTermo: true,
  ativo: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
  atualizadoEm: '2026-09-01T00:00:00.000Z',
  _count: { equipamentos: 1 },
};

const equipamentoLivre: Equipamento = {
  id: 'eq1',
  tipoId: 'tipo1',
  tipo: { id: 'tipo1', nome: 'Notebook', exigeTermo: true },
  numero: 'PAT-001',
  numeroSerie: null,
  marca: 'Dell',
  modelo: 'Latitude',
  estado: 'NOVO',
  status: 'ESTOQUE',
  dataAquisicao: null,
  valorAquisicao: null,
  observacoes: null,
  ativo: true,
  criadoEm: '2026-09-01T00:00:00.000Z',
  atualizadoEm: '2026-09-01T00:00:00.000Z',
  alocacoes: [],
};

const equipamentoLivre2: Equipamento = {
  ...equipamentoLivre,
  id: 'eq3',
  numero: 'PAT-003',
};

const equipamentoEmUso: Equipamento = {
  ...equipamentoLivre,
  id: 'eq2',
  numero: 'PAT-002',
  status: 'EM_USO',
  alocacoes: [
    {
      id: 'aloc1',
      equipamentoId: 'eq2',
      colaboradorId: 'user1',
      colaborador: { id: 'user1', nome: 'Ana Lima', email: 'ana@suri.com', statusColaborador: 'ATIVO' },
      dataInicio: '2026-09-01T00:00:00.000Z',
      dataDevolucao: null,
      status: 'ENTREGUE',
      estadoNaEntrega: 'NOVO',
      estadoNaDevolucao: null,
      observacoes: null,
      motivoDevolucao: null,
      termoNome: null,
      termoCaminho: null,
      termoMimeType: null,
      termoEnviadoEm: null,
      registradoPorId: 'admin1',
      criadoEm: '2026-09-01T00:00:00.000Z',
      atualizadoEm: '2026-09-01T00:00:00.000Z',
    },
  ],
};

let equipamentos: Equipamento[] = [equipamentoLivre, equipamentoEmUso];
let papel: 'ADMIN' | 'USER' = 'ADMIN';

vi.mock('../hooks/usePatrimonio', () => ({
  useEquipamentos: () => ({ data: equipamentos, isLoading: false, isError: false, refetch: vi.fn() }),
  useResumoEquipamentos: () => ({
    data: { total: 2, porStatus: { EM_COMPRA: 0, AGUARDANDO_CHEGADA: 0, ESTOQUE: 1, EM_USO: 1, MANUTENCAO: 0, BAIXADO: 0 } },
  }),
  useTiposEquipamento: () => ({ data: [tipo], isLoading: false, isError: false }),
  useCreateEquipamento: () => createEquipamentoMutation,
  useUpdateEquipamento: () => updateEquipamentoMutation,
  useDeactivateEquipamento: () => deactivateEquipamentoMutation,
  useDeleteEquipamentoPermanently: () => deleteEquipamentoMutation,
  useCreateAlocacao: () => createAlocacaoMutation,
  useDevolverAlocacao: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useCancelarAlocacao: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useAnexarTermo: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
  useAnexarTermoLote: () => anexarTermoLoteMutation,
  useRemoverTermo: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

vi.mock('../../usuarios/hooks/useUsuarios', () => ({
  useUsuarios: () => ({
    data: [{ id: 'user1', nome: 'Ana Lima', ativo: true, statusColaborador: 'ATIVO' }],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('../../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin1', nome: 'Admin', email: 'admin@suri.com', role: papel, rotinas: ['patrimonio'] } }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

describe('PatrimonioPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    equipamentos = [equipamentoLivre, equipamentoEmUso];
    papel = 'ADMIN';
  });

  it('lista o inventário com situação e colaborador atual', () => {
    render(<PatrimonioPage />);
    expect(screen.getByText('Pat. PAT-001 · Dell · Latitude')).toBeInTheDocument();
    expect(screen.getByText('Pat. PAT-002 · Dell · Latitude')).toBeInTheDocument();
    expect(screen.getByText('Ana Lima')).toBeInTheDocument();
  });

  it('cadastra um novo equipamento', async () => {
    render(<PatrimonioPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo equipamento' }));
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'tipo1');
    await userEvent.type(screen.getByLabelText('Número de patrimônio'), 'PAT-010');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createEquipamentoMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ tipoId: 'tipo1', numero: 'PAT-010' }),
    );
  });

  it('vincula um equipamento disponível a um colaborador', async () => {
    render(<PatrimonioPage />);
    await userEvent.click(screen.getByTitle('Vincular a colaborador'));
    const dialog = screen.getByRole('dialog', { name: 'Vincular a colaborador' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Colaborador'), 'user1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vincular' }));
    expect(createAlocacaoMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ equipamentoId: 'eq1', colaboradorId: 'user1' }),
    );
  });

  it('esconde as ações de escrita para quem não é admin', () => {
    papel = 'USER';
    render(<PatrimonioPage />);
    expect(screen.queryByRole('button', { name: 'Novo equipamento' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Vincular a colaborador')).not.toBeInTheDocument();
  });

  it('mostra "—" quando a API não revela o colaborador (equipamento de outra pessoa)', () => {
    equipamentos = [
      equipamentoLivre,
      {
        ...equipamentoEmUso,
        alocacoes: [{ ...equipamentoEmUso.alocacoes[0], colaboradorId: '', colaborador: { id: '', nome: '', email: '', statusColaborador: 'ATIVO' } }],
      },
    ];
    render(<PatrimonioPage />);
    expect(screen.queryByText('Ana Lima')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('vincula vários equipamentos selecionados de uma vez com um único termo', async () => {
    equipamentos = [equipamentoLivre, equipamentoLivre2, equipamentoEmUso];
    render(<PatrimonioPage />);

    const checkboxes = screen.getAllByRole('checkbox', { name: /Selecionar Notebook/ });
    expect(checkboxes).toHaveLength(2);
    await userEvent.click(checkboxes[0]);
    await userEvent.click(checkboxes[1]);

    await userEvent.click(screen.getByRole('button', { name: 'Vincular selecionados' }));
    const dialog = screen.getByRole('dialog', { name: 'Vincular equipamentos selecionados' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Colaborador'), 'user1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Vincular 2 item(ns)' }));

    expect(createAlocacaoMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ equipamentoId: 'eq1', colaboradorId: 'user1' }),
    );
    expect(createAlocacaoMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ equipamentoId: 'eq3', colaboradorId: 'user1' }),
    );

    expect(await screen.findByText(/equipamento\(s\) vinculado\(s\)/)).toBeInTheDocument();
  });
});
