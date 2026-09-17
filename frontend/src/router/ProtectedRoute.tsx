import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';
import { satisfazRole, type UserRole } from '../types/auth.types';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Mínimo exigido — hierarquia, não igualdade: MASTER passa em `requireRole="ADMIN"`. */
  requireRole?: UserRole;
  requireRotina?: string;
}

export function ProtectedRoute({ children, requireRole, requireRotina }: ProtectedRouteProps) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && !satisfazRole(user.role, requireRole)) return <Navigate to="/perfil" replace />;
  if (requireRotina && !satisfazRole(user.role, 'ADMIN') && !user.rotinas.includes(requireRotina)) {
    return <Navigate to="/perfil" replace />;
  }
  return <>{children}</>;
}
