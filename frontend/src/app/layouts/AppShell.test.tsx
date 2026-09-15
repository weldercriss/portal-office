import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../shared/auth/AuthContext';
import { AppShell } from './AppShell';

vi.mock('../../modules/notificacoes/hooks/useNotificacoes', () => ({
  useNotificacoes: () => ({ data: [] }),
  useContagemNaoLidas: () => ({ data: { total: 0 } }),
  useMarcarComoLida: () => ({ mutate: vi.fn() }),
  useMarcarTodasComoLidas: () => ({ mutate: vi.fn() }),
  useLimparNotificacoes: () => ({ mutate: vi.fn() }),
}));

vi.mock('../../modules/notificacoes/hooks/useNotificacoesSocket', () => ({
  useNotificacoesSocket: () => undefined,
}));

function renderShell(role: 'ADMIN' | 'USER') {
  return render(
    <AuthContext.Provider
      value={{
        user: { id: '1', nome: 'Ana', email: 'ana@example.com', role, rotinas: ['dashboard', 'plantoes', 'solicitacoes'] },
        accessToken: null,
        login: vi.fn(),
        loginWithGoogle: vi.fn(),
        refreshUser: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <MemoryRouter>
        <AppShell>
          <p>conteúdo</p>
        </AppShell>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('AppShell', () => {
  it('hides the admin-only nav item for a regular USER', () => {
    renderShell('USER');
    expect(screen.queryByText('Configurações')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows the admin-only nav item for an ADMIN', () => {
    renderShell('ADMIN');
    expect(screen.getByText('Configurações')).toBeInTheDocument();
  });

  it.each(['ADMIN', 'USER'] as const)('does not show Comunicados for %s', (role) => {
    renderShell(role);
    expect(screen.queryByRole('link', { name: 'Comunicados' })).not.toBeInTheDocument();
  });

  it('renders the page content passed as children', () => {
    renderShell('USER');
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });
});
