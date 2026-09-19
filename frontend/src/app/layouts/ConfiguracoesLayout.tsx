import { NavLink, Outlet } from 'react-router-dom';
import { PageShell } from '../../components/system/PageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { useAuth } from '../../shared/auth/AuthContext';

const TABS = [
  { to: '/configuracoes/colaboradores', label: 'Colaboradores' },
  { to: '/configuracoes/departamentos', label: 'Departamentos' },
 // { to: '/configuracoes/vagas', label: 'Recrutamento' },
  { to: '/configuracoes/permissoes', label: 'Permissões' },
  { to: '/configuracoes/tipos-e-categorias', label: 'Tipos e categorias' },
  { to: '/configuracoes/plantoes', label: 'Plantões' },
  { to: '/configuracoes/salas', label: 'Salas' },
  { to: '/configuracoes/notificacoes', label: 'Notificações' },
];

/** Exclusiva do usuário master (administração de plataforma) — nem ADMIN vê. */
const TABS_MASTER = [{ to: '/configuracoes/plataforma', label: 'Plataforma' }];

export function ConfiguracoesLayout() {
  const { user } = useAuth();
  const tabs = user?.role === 'MASTER' ? [...TABS, ...TABS_MASTER] : TABS;

  return (
    <PageShell>
      <PageHeader title="Configurações" description="Gerencie usuários, departamentos, escalas e registros do portal." />

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              [
                '-mb-px border-b-2 px-4 py-2 text-sm font-bold transition-colors',
                isActive
                  ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
              ].join(' ')
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </PageShell>
  );
}
