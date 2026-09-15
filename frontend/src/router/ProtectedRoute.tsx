import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';
import type { UserRole } from '../types/auth.types';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: UserRole;
  requireRotina?: string;
}

export function ProtectedRoute({ children, requireRole, requireRotina }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/perfil" replace />;
  if (requireRotina && user.role !== 'ADMIN' && !user.rotinas.includes(requireRotina)) {
    return <Navigate to="/perfil" replace />;
  }
  return <>{children}</>;
}
