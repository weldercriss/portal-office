import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConviteAgendaDialog } from './ConviteAgendaDialog';
import type { ConviteAgenda } from '../types/convite-agenda.types';

const verificarMutation = { mutateAsync: vi.fn(), isPending: false };
const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
let organizadorStatus: { data: unknown; isLoading: boolean };

vi.mock('../hooks/useConvitesAgenda', () => ({
  useColaboradoresParaConvite: () => ({
    data: [
      { id: 'u1', nome: 'Ana Lima', email: 'ana@empresa.com' },
      { id: 'u2', nome: 'Bruno Souza', email: 'bruno@empresa.com' },
    ],
    isLoading: false,
  }),
  useOrganizadorStatus: () => organizadorStatus,
  useVerificarConviteAgenda: () => verificarMutation,
  useCreateConviteAgenda: () => createMutation,
  useUpdateConviteAgenda: () => updateMutation,
}));

vi.mock('../../usuarios/api/agenda-google.api', () => ({
  iniciarConexaoAgendaGoogle: vi.fn().mockResolvedValue({ url: 'https://accounts.google.com/o/oauth2/auth' }),
}));

const CONVITE_NOVO: ConviteAgenda = {
  id: 'c1',
  titulo: 'Kickoff Q4',
  descricao: null,
  local: null,
  inicio: '2098-12-31T14:00:00.000Z',
  fim: '2098-12-31T15:00:00.000Z',
  criadoPor: { id: 'admin1', nome: 'Admin' },
  criadoEm: '2026-09-15T00:00:00.000Z',
  modo: 'EVENTO_COM_CONVIDADOS',
  statusEvento: 'ENVIADO',
  organizadorEmail: 'admin@empresa.com',
  enviadoEm: '2026-09-15T00:05:00.000Z',
  canceladoEm: null,
  respostasSincronizadasEm: null,
  destinatarios: [
    { id: 'd1', userId: 'u1', user: { id: 'u1', nome: 'Ana Lima', email: 'ana@empresa.com' }, email: 'ana@empresa.com', nome: 'Ana Lima', status: null, erro: null, resposta: 'ACEITO', respondidoEm: '2026-09-16T00:00:00.000Z' },
    { id: 'd2', userId: null, user: null, email: 'externo@fora.com', nome: null, status: null, erro: null, resposta: 'PENDENTE', respondidoEm: null },
  ],
};

const CONVITE_LEGADO: ConviteAgenda = {
  ...CONVITE_NOVO,
  id: 'c2',
  modo: 'COPIAS_INDIVIDUAIS',
  statusEvento: null,
  organizadorEmail: null,
  destinatarios: [
    { id: 'd3', userId: 'u1', user: { id: 'u1', nome: 'Ana Lima', email: 'ana@empresa.com' }, email: 'ana@empresa.com', nome: null, status: 'CRIADO', erro: null, resposta: 'PENDENTE', respondidoEm: null },
  ],
};

function renderComQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function abrirNovo() {
  renderComQueryClient(<ConviteAgendaDialog open onOpenChange={vi.fn()} />);
}

function abrirEdicao(convite: ConviteAgenda) {
  renderComQueryClient(<ConviteAgendaDialog open onOpenChange={vi.fn()} convite={convite} />);
}

async function preencherHorario() {
  await userEvent.type(screen.getByLabelText('Título'), 'Reunião geral');
  await userEvent.type(screen.getByLabelText('Início'), '2098-12-31T14:00');
  await userEvent.type(screen.getByLabelText('Fim'), '2098-12-31T15:00');
}

describe('ConviteAgendaDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    organizadorStatus = { data: { conectado: true, email: 'admin@empresa.com', precisaReconectar: false, podeConsultarDisponibilidade: true }, isLoading: false };
    verificarMutation.mutateAsync.mockResolvedValue([{ email: 'ana@empresa.com', status: 'LIVRE', ocupado: [] }]);
  });

  describe('criação', () => {
    it('mostra de qual e-mail os convites sairão quando o organizador está conectado', () => {
      abrirNovo();
      expect(screen.getByText(/admin@empresa.com/)).toBeInTheDocument();
    });

    it('bloqueia verificar/enviar e oferece conectar quando o organizador não está conectado', () => {
      organizadorStatus = { data: { conectado: false, email: null, precisaReconectar: false, podeConsultarDisponibilidade: false }, isLoading: false };
      abrirNovo();

      expect(screen.getByRole('button', { name: /Conectar Agenda Google/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Verificar disponibilidade/ })).toBeDisabled();
    });

    it('colaboradores estão sempre selecionáveis, sem indicação de indisponível', () => {
      abrirNovo();
      expect(screen.queryByText('Indisponível')).not.toBeInTheDocument();
      const linhaBruno = screen.getByText('Bruno Souza').closest('label')!;
      expect(within(linhaBruno).getByRole('checkbox')).toBeEnabled();
    });

    it('adiciona e-mail manual como chip e recusa duplicado', async () => {
      abrirNovo();
      const campo = screen.getByLabelText('Adicionar e-mail sem cadastro');

      await userEvent.type(campo, 'externo@fora.com{Enter}');
      expect(screen.getByText('externo@fora.com')).toBeInTheDocument();
      expect(screen.getAllByText('Sem cadastro no portal')).toHaveLength(1);

      await userEvent.type(campo, 'externo@fora.com{Enter}');
      expect(screen.getByText('Esse e-mail já está na lista.')).toBeInTheDocument();
    });

    it('não deixa enviar sem antes verificar a disponibilidade', async () => {
      abrirNovo();
      await preencherHorario();
      const linhaAna = screen.getByText('Ana Lima').closest('label')!;
      await userEvent.click(within(linhaAna).getByRole('checkbox'));

      expect(screen.getByRole('button', { name: /Enviar convites/ })).toBeDisabled();

      await userEvent.click(screen.getByRole('button', { name: /Verificar disponibilidade/ }));

      expect(verificarMutation.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ destinatarioEmails: ['ana@empresa.com'] }));
      expect(screen.getByRole('button', { name: /Enviar convites/ })).toBeEnabled();

      await userEvent.click(screen.getByRole('button', { name: /Enviar convites/ }));
      expect(createMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ destinatarioEmails: ['ana@empresa.com'] }),
      );
    });
  });

  describe('edição', () => {
    it('modo com convidados mostra a resposta de cada destinatário, sem checkbox', () => {
      abrirEdicao(CONVITE_NOVO);

      expect(screen.getByLabelText('Título')).toHaveValue('Kickoff Q4');
      expect(screen.getByText('Ana Lima')).toBeInTheDocument();
      expect(screen.getByText('Aceito')).toBeInTheDocument();
      expect(screen.getByText('Pendente')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('não exige verificação para salvar edição', () => {
      abrirEdicao(CONVITE_NOVO);
      expect(screen.getByRole('button', { name: /Salvar alterações/ })).toBeEnabled();
      expect(screen.queryByRole('button', { name: /Verificar disponibilidade/ })).not.toBeInTheDocument();
    });

    it('salva sem alterar destinatários', async () => {
      abrirEdicao(CONVITE_NOVO);
      await userEvent.click(screen.getByRole('button', { name: /Salvar alterações/ }));

      expect(updateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c1', input: expect.objectContaining({ titulo: 'Kickoff Q4' }) }),
      );
      expect(createMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('convite legado mostra o status antigo e não exige o organizador conectado', () => {
      organizadorStatus = { data: { conectado: false, email: null, precisaReconectar: false, podeConsultarDisponibilidade: false }, isLoading: false };
      abrirEdicao(CONVITE_LEGADO);

      expect(screen.queryByRole('button', { name: /Conectar Agenda Google/ })).not.toBeInTheDocument();
      expect(screen.getByText('Criado')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Salvar alterações/ })).toBeEnabled();
    });
  });
});
