import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../shared/auth/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function renderWithUser(
  user: { id: string; nome: string; email: string; role: 'ADMIN' | 'USER'; rotinas: string[] } | null,
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
});
