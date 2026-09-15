import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import App from '../App';

const pendingPages = vi.hoisted(() => {
  let resolveDepartments!: () => void;
  let resolveDashboard!: () => void;
  return {
    departments: new Promise<void>((resolve) => { resolveDepartments = resolve; }),
    dashboard: new Promise<void>((resolve) => { resolveDashboard = resolve; }),
    resolveDepartments: () => resolveDepartments(),
    resolveDashboard: () => resolveDashboard(),
    departmentsRequested: vi.fn(),
    dashboardRequested: vi.fn(),
  };
});

vi.mock('../shared/auth/AuthContext', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: { id: 'admin', nome: 'Admin', email: 'admin@example.com', role: 'ADMIN', rotinas: [] },
    accessToken: null,
    logout: vi.fn(),
  }),
}));
vi.mock('../modules/notificacoes/components/NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../modules/usuarios/pages/ColaboradoresAdminPage', () => ({
  default: () => <h2>Lista de colaboradores</h2>,
}));
vi.mock('../modules/departamentos/pages/DepartamentosAdminPage', async () => {
  pendingPages.departmentsRequested();
  await pendingPages.departments;
  return { default: () => <h2>Lista de departamentos</h2> };
});
vi.mock('../modules/dashboard/pages/DashboardPage', async () => {
  pendingPages.dashboardRequested();
  await pendingPages.dashboard;
  return { default: () => <h2>Resumo do dashboard</h2> };
});

afterEach(async () => {
  await act(async () => {
    pendingPages.resolveDepartments();
    pendingPages.resolveDashboard();
  });
  window.history.replaceState(null, '', '/');
});

it('keeps the current page and configuration tabs visible while the next route loads', async () => {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/configuracoes/colaboradores');
  render(<App />);
  await screen.findByRole('heading', { name: 'Lista de colaboradores' });
  const configHeading = screen.getByRole('heading', { name: 'Configurações' });

  await user.click(screen.getByRole('link', { name: 'Departamentos' }));
  await waitFor(() => expect(pendingPages.departmentsRequested).toHaveBeenCalled());
  expect(configHeading).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Lista de colaboradores' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Carregando' })).not.toBeInTheDocument();

  await act(async () => { pendingPages.resolveDepartments(); });
  await screen.findByRole('heading', { name: 'Lista de departamentos' });
  expect(screen.getByRole('heading', { name: 'Configurações' })).toBe(configHeading);

  await user.click(screen.getByRole('link', { name: 'Dashboard' }));
  await waitFor(() => expect(pendingPages.dashboardRequested).toHaveBeenCalled());
  expect(screen.getByRole('heading', { name: 'Lista de departamentos' })).toBeVisible();
  expect(screen.queryByRole('status', { name: 'Carregando' })).not.toBeInTheDocument();

  await act(async () => { pendingPages.resolveDashboard(); });
  await screen.findByRole('heading', { name: 'Resumo do dashboard' });
  await act(async () => { window.history.back(); });
  expect(await screen.findByRole('heading', { name: 'Lista de departamentos' })).toBeVisible();
});
