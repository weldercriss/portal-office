import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppShell } from '../app/layouts/AppShell';
import { ConfiguracoesLayout } from '../app/layouts/ConfiguracoesLayout';
import { NotificacoesLayout } from '../app/layouts/NotificacoesLayout';
import { PlataformaLayout } from '../app/layouts/PlataformaLayout';
import { RelatoriosLayout } from '../app/layouts/RelatoriosLayout';
import { TiposECategoriasLayout } from '../app/layouts/TiposECategoriasLayout';
import { LoadingState } from '../components/ui/LoadingState';
import FormularioPublicoPage from '../modules/solicitacoes/pages/FormularioPublicoPage';
import LoginPage from '../pages/LoginPage';
import { useAuth } from '../shared/auth/AuthContext';
import { satisfazRole, type AuthUser } from '../types/auth.types';
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
const ConvitesAgendaPage = lazy(() => import('../modules/convites-agenda/pages/ConvitesAgendaPage'));
const LogsAplicacaoPage = lazy(() => import('../modules/logs-aplicacao/pages/LogsAplicacaoPage'));
const MasterUsuariosPage = lazy(() => import('../modules/master/pages/MasterUsuariosPage'));
const SolicitacoesPage = lazy(() => import('../modules/solicitacoes/pages/SolicitacoesPage'));
const SolicitacoesAdminPage = lazy(() => import('../modules/solicitacoes/pages/SolicitacoesAdminPage'));
const TiposSolicitacaoAdminPage = lazy(() => import('../modules/tipos-solicitacao/pages/TiposSolicitacaoAdminPage'));
const TiposPlantaoAdminPage = lazy(() => import('../modules/tipos-plantao/pages/TiposPlantaoAdminPage'));
const PatrimonioPage = lazy(() => import('../modules/patrimonio/pages/PatrimonioPage'));
const TiposEquipamentoAdminPage = lazy(() => import('../modules/patrimonio/pages/TiposEquipamentoAdminPage'));
const CategoriasDocumentoAdminPage = lazy(() => import('../modules/categorias-documento/pages/CategoriasDocumentoAdminPage'));
const CentralDocumentosPage = lazy(() => import('../modules/central-documentos/pages/CentralDocumentosPage'));
const TelegramConfigAdminPage = lazy(() => import('../modules/telegram-config/pages/TelegramConfigAdminPage'));
const AvisosAniversarioAdminPage = lazy(() => import('../modules/avisos-aniversario/pages/AvisosAniversarioAdminPage'));
const FichaColaboradorPage = lazy(() => import('../modules/colaboradores-rh/pages/FichaColaboradorPage'));
const MinhaEquipePage = lazy(() => import('../modules/equipe/pages/MinhaEquipePage'));
const VagasAdminPage = lazy(() => import('../modules/recrutamento/pages/VagasAdminPage'));
const TurnoverAdminPage = lazy(() => import('../modules/relatorios/pages/TurnoverAdminPage'));
const ColaboradoresRelatorioPage = lazy(() => import('../modules/relatorios/pages/ColaboradoresRelatorioPage'));
const PesquisasRelatorioPage = lazy(() => import('../modules/relatorios/pages/PesquisasRelatorioPage'));
const VagaDetalhePage = lazy(() => import('../modules/recrutamento/pages/VagaDetalhePage'));
const PesquisasAdminPage = lazy(() => import('../modules/pesquisas/pages/PesquisasAdminPage'));
const PesquisasPage = lazy(() => import('../modules/pesquisas/pages/PesquisasPage'));
const PesquisaResultadoPage = lazy(() => import('../modules/pesquisas/pages/PesquisaResultadoPage'));

export function landingPath(user: AuthUser | null): string {
  if (!user) return '/login';
  if (satisfazRole(user.role, 'ADMIN') || user.rotinas.includes('dashboard')) return '/';
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
      <Route path="/formulario-publico/:token" element={<FormularioPublicoPage />} />
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
          path="/minha-equipe"
          element={
            <ProtectedRoute requireRole="GESTOR">
              <MinhaEquipePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plantoes"
          element={
            <ProtectedRoute requireRotina="plantoes">
              {user && satisfazRole(user.role, 'ADMIN') ? (
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
              {user && satisfazRole(user.role, 'ADMIN') ? <SolicitacoesAdminPage /> : <SolicitacoesPage />}
            </ProtectedRoute>
          }
        />
        <Route
          path="/patrimonio"
          element={
            <ProtectedRoute requireRotina="patrimonio">
              <PatrimonioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <ConvitesAgendaPage />
            </ProtectedRoute>
          }
        />
        <Route path="/convites-agenda" element={<Navigate to="/agenda" replace />} />
        <Route
          path="/central-documentos"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <CentralDocumentosPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <RelatoriosLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/relatorios/colaboradores" replace />} />
          <Route path="colaboradores" element={<ColaboradoresRelatorioPage />} />
          <Route path="turnover" element={<TurnoverAdminPage />} />
          <Route path="pesquisas" element={<PesquisasRelatorioPage />} />
        </Route>
        <Route path="/pesquisas" element={user && satisfazRole(user.role, 'ADMIN') ? <PesquisasAdminPage /> : <PesquisasPage />} />
        <Route
          path="/pesquisas/:id"
          element={
            <ProtectedRoute requireRole="ADMIN">
              <PesquisaResultadoPage />
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
          <Route path="tipos-e-categorias" element={<TiposECategoriasLayout />}>
            <Route index element={<Navigate to="/configuracoes/tipos-e-categorias/solicitacao" replace />} />
            <Route path="solicitacao" element={<TiposSolicitacaoAdminPage />} />
            <Route path="equipamento" element={<TiposEquipamentoAdminPage />} />
            <Route path="documento" element={<CategoriasDocumentoAdminPage />} />
          </Route>
          <Route path="tipos-solicitacao" element={<Navigate to="/configuracoes/tipos-e-categorias/solicitacao" replace />} />
          <Route path="tipos-equipamento" element={<Navigate to="/configuracoes/tipos-e-categorias/equipamento" replace />} />
          <Route path="categorias-documento" element={<Navigate to="/configuracoes/tipos-e-categorias/documento" replace />} />
          <Route path="salas" element={<SalasAdminPage />} />
          <Route path="plantoes" element={<TiposPlantaoAdminPage />} />
          <Route path="plantoes/turnos" element={<Navigate to="/configuracoes/plantoes" replace />} />
          <Route path="plantoes/tipos-plantao" element={<Navigate to="/configuracoes/plantoes" replace />} />
          <Route path="turnos" element={<Navigate to="/configuracoes/plantoes" replace />} />
          <Route path="tipos-plantao" element={<Navigate to="/configuracoes/plantoes" replace />} />
          <Route path="notificacoes" element={<NotificacoesLayout />}>
            <Route index element={<Navigate to="/configuracoes/notificacoes/internas" replace />} />
            <Route path="internas" element={<AvisosAniversarioAdminPage />} />
            <Route path="telegram" element={<TelegramConfigAdminPage />} />
          </Route>
          <Route path="telegram" element={<Navigate to="/configuracoes/notificacoes/telegram" replace />} />
          <Route path="avisos-aniversario" element={<Navigate to="/configuracoes/notificacoes/internas" replace />} />
          <Route path="vagas" element={<VagasAdminPage />} />
          <Route
            path="plataforma"
            element={
              <ProtectedRoute requireRole="MASTER">
                <PlataformaLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/configuracoes/plataforma/usuarios-master" replace />} />
            <Route path="usuarios-master" element={<MasterUsuariosPage />} />
            <Route path="logs" element={<LogsAplicacaoPage />} />
          </Route>
          <Route path="usuarios-master" element={<Navigate to="/configuracoes/plataforma/usuarios-master" replace />} />
          <Route path="logs" element={<Navigate to="/configuracoes/plataforma/logs" replace />} />
        </Route>
        <Route path="/logs" element={<Navigate to="/configuracoes/plataforma/logs" replace />} />
        <Route path="/master/usuarios" element={<Navigate to="/configuracoes/plataforma/usuarios-master" replace />} />
        <Route path="/configuracoes/colaboradores/:id" element={<FichaColaboradorPage />} />
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
