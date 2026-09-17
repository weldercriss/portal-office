import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../shared/auth/AuthContext';
import type { UserRole } from '../types/auth.types';
import { ProtectedRoute } from './ProtectedRoute';

function renderWithUser(
  user: { id: string; nome: string; email: string; role: UserRole; rotinas: string[] } | null,
  initialPath: string,
) {
  return render(
    <AuthContext.Provider value={{ user, accessToken: null, login: vi.fn(), loginWithGoogle: vi.fn(), refreshUser: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<p>tela de login</p>} />
          <Route path="/perfil" element={<p>meu perfil</p>} />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute requireRole="ADMIN">
                <p>admin de usuários</p>
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs"
            element={
              <ProtectedRoute requireRole="MASTER">
                <p>tela do master</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when there is no authenticated user', () => {
    renderWithUser(null, '/usuarios');
    expect(screen.getByText('tela de login')).toBeInTheDocument();
  });

  it('redirects a USER away from an ADMIN-only route', () => {
    renderWithUser({ id: '1', nome: 'Ana', email: 'ana@example.com', role: 'USER', rotinas: [] }, '/usuarios');
    expect(screen.getByText('meu perfil')).toBeInTheDocument();
  });

  it('renders the protected content for an ADMIN', () => {
    renderWithUser({ id: '1', nome: 'Admin', email: 'admin@example.com', role: 'ADMIN', rotinas: [] }, '/usuarios');
    expect(screen.getByText('admin de usuários')).toBeInTheDocument();
  });

  it('lets MASTER through an ADMIN-only route (hierarquia)', () => {
    renderWithUser({ id: '1', nome: 'Master', email: 'master@example.com', role: 'MASTER', rotinas: [] }, '/usuarios');
    expect(screen.getByText('admin de usuários')).toBeInTheDocument();
  });

  it('redirects an ADMIN away from a MASTER-only route', () => {
    renderWithUser({ id: '1', nome: 'Admin', email: 'admin@example.com', role: 'ADMIN', rotinas: [] }, '/logs');
    expect(screen.getByText('meu perfil')).toBeInTheDocument();
  });

  it('renders the protected content for MASTER on a MASTER-only route', () => {
    renderWithUser({ id: '1', nome: 'Master', email: 'master@example.com', role: 'MASTER', rotinas: [] }, '/logs');
    expect(screen.getByText('tela do master')).toBeInTheDocument();
  });
});
