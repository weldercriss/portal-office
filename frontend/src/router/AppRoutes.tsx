import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '../app/layouts/AppShell';
import { ConfiguracoesLayout } from '../app/layouts/ConfiguracoesLayout';
import { ConfiguracoesPlantoesLayout } from '../app/layouts/ConfiguracoesPlantoesLayout';
import { LoadingState } from '../components/ui/LoadingState';
import LoginPage from '../pages/LoginPage';
import { useAuth } from '../shared/auth/AuthContext';
import type { AuthUser } from '../types/auth.types';
import { ProtectedRoute } from './ProtectedRoute';

const DashboardPage = lazy(() => import('../modules/dashboard/pages/DashboardPage'));
const ColaboradoresAdminPage = lazy(() => import('../modules/usuarios/pages/ColaboradoresAdminPage'));
const DepartamentosAdminPage = lazy(() => import('../modules/departamentos/pages/DepartamentosAdminPage'));
const PermissoesAdminPage = lazy(() => import('../modules/permissoes/pages/PermissoesAdminPage'));
const MeuPerfilPage = lazy(() => import('../modules/usuarios/pages/MeuPerfilPage'));
const PlantoesAdminPage = lazy(() => import('../modules/plantoes/pages/PlantoesAdminPage'));
//const MeusPlantoesPage = lazy(() => import('../modules/plantoes/pages/MeusPlantoesPage'));
const AgendamentosPage = lazy(() => import('../modules/agendamento/pages/AgendamentosPage'));
const SalasAdminPage = lazy(() => import('../modules/agendamento/pages/SalasAdminPage'));
const SolicitacoesPage = lazy(() => import('../modules/solicitacoes/pages/SolicitacoesPage'));
const SolicitacoesAdminPage = lazy(() => import('../modules/solicitacoes/pages/SolicitacoesAdminPage'));
const TiposSolicitacaoAdminPage = lazy(() => import('../modules/tipos-solicitacao/pages/TiposSolicitacaoAdminPage'));
const TurnosAdminPage = lazy(() => import('../modules/turnos/pages/TurnosAdminPage'));
const TiposPlantaoAdminPage = lazy(() => import('../modules/tipos-plantao/pages/TiposPlantaoAdminPage'));
const TelegramConfigAdminPage = lazy(() => import('../modules/telegram-config/pages/TelegramConfigAdminPage'));
const FichaColaboradorPage = lazy(() => import('../modules/colaboradores-rh/pages/FichaColaboradorPage'));
const VagasAdminPage = lazy(() => import('../modules/recrutamento/pages/VagasAdminPage'));
const VagaDetalhePage = lazy(() => import('../modules/recrutamento/pages/VagaDetalhePage'));

export function landingPath(user: AuthUser | null): string {
  if (!user) return '/login';
  if (user.role === 'ADMIN' || user.rotinas.includes('dashboard')) return '/';
  return '/perfil';
}

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense
          fallback={
            <div className="p-8">
              <LoadingState />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

export function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={landingPath(user)} replace /> : <LoginPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route
          path="/"
          element={
            <ProtectedRoute requireRotina="dashboard">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="/perfil" element={<MeuPerfilPage />} />
        <Route
          path="/plantoes"
          element={
            <ProtectedRoute requireRotina="plantoes">
              {user?.role === 'ADMIN' ? (
                <PlantoesAdminPage />
              ): (
                <Navigate to="/" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/agendamentos"
          element={
            <ProtectedRoute requireRotina="agendamentos">
              <AgendamentosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/solicitacoes"
          element={
            <ProtectedRoute requireRotina="solicitacoes">
              {user?.role === 'ADMIN' ? <SolicitacoesAdminPage /> : <SolicitacoesPage />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <ConfiguracoesLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/configuracoes/colaboradores" replace />} />
          <Route path="colaboradores" element={<ColaboradoresAdminPage />} />
          <Route path="departamentos" element={<DepartamentosAdminPage />} />
          <Route path="permissoes" element={<PermissoesAdminPage />} />
          <Route path="tipos-solicitacao" element={<TiposSolicitacaoAdminPage />} />
          <Route path="salas" element={<SalasAdminPage />} />
          <Route path="plantoes" element={<ConfiguracoesPlantoesLayout />}>
            <Route index element={<Navigate to="turnos" replace />} />
            <Route path="turnos" element={<TurnosAdminPage />} />
            <Route path="tipos-plantao" element={<TiposPlantaoAdminPage />} />
          </Route>
          <Route path="turnos" element={<Navigate to="/configuracoes/plantoes/turnos" replace />} />
          <Route path="tipos-plantao" element={<Navigate to="/configuracoes/plantoes/tipos-plantao" replace />} />
          <Route path="telegram" element={<TelegramConfigAdminPage />} />
          <Route path="vagas" element={<VagasAdminPage />} />
        </Route>
        <Route
          path="/configuracoes/colaboradores/:id"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <FichaColaboradorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes/vagas/:id"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <VagaDetalhePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to={landingPath(user)} replace />} />
    </Routes>
  );
}
