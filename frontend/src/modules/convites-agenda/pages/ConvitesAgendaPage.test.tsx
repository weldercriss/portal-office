import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConvitesAgendaPage from './ConvitesAgendaPage';
import type { ConviteAgenda } from '../types/convite-agenda.types';

function renderComQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const CONVITE: ConviteAgenda = {
  id: 'c1',
  titulo: 'Kickoff Q4',
  descricao: null,
  local: null,
  inicio: '2098-12-31T14:00:00.000Z',
  fim: '2098-12-31T15:00:00.000Z',
  criadoPor: { id: 'admin1', nome: 'Admin' },
  criadoEm: '2026-09-15T00:00:00.000Z',
  modo: 'EVENTO_COM_CONVIDADOS',
  comMeet: true,
  statusEvento: 'ENVIADO',
  organizadorEmail: 'admin@empresa.com',
  enviadoEm: '2026-09-15T00:05:00.000Z',
  canceladoEm: null,
  respostasSincronizadasEm: null,
  destinatarios: [],
};

const deleteMutation = { mutate: vi.fn(), isPending: false };

vi.mock('../hooks/useConvitesAgenda', () => ({
  useConvitesAgenda: () => ({ data: [CONVITE], isLoading: false, isError: false, refetch: vi.fn() }),
  useCancelarConviteAgenda: () => ({ mutate: vi.fn(), isPending: false }),
  useReenviarConviteAgenda: () => ({ mutate: vi.fn(), isPending: false }),
  useSincronizarRespostasConviteAgenda: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteConviteAgenda: () => deleteMutation,
  useColaboradoresParaConvite: () => ({ data: [], isLoading: false }),
  useOrganizadorStatus: () => ({ data: undefined, isLoading: false }),
  useVerificarConviteAgenda: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateConviteAgenda: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateConviteAgenda: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../../usuarios/api/agenda-google.api', () => ({
  iniciarConexaoAgendaGoogle: vi.fn(),
}));

let papel: 'ADMIN' | 'MASTER' = 'ADMIN';
vi.mock('../../../shared/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin1', nome: 'Admin', email: 'admin@empresa.com', role: papel, rotinas: [] } }),
}));

describe('ConvitesAgendaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    papel = 'ADMIN';
  });

  it('só oferece excluir para MASTER, e exclui após confirmar', async () => {
    const { unmount } = renderComQueryClient(<ConvitesAgendaPage />);
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    unmount();

    papel = 'MASTER';
    renderComQueryClient(<ConvitesAgendaPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir permanentemente' }));
    expect(deleteMutation.mutate).toHaveBeenCalledWith('c1', expect.anything());
  });
});
