import { NavLink, Outlet } from 'react-router-dom';
import { PageShell } from '../../components/system/PageShell';
import { PageHeader } from '../../components/ui/PageHeader';

const TABS = [
  { to: '/configuracoes/colaboradores', label: 'Colaboradores' },
  { to: '/configuracoes/departamentos', label: 'Departamentos' },
 // { to: '/configuracoes/vagas', label: 'Recrutamento' },
  { to: '/configuracoes/permissoes', label: 'Permissões' },
  { to: '/configuracoes/tipos-solicitacao', label: 'Tipos de solicitação' },
  { to: '/configuracoes/tipos-equipamento', label: 'Tipos de equipamento' },
  { to: '/configuracoes/plantoes', label: 'Plantões' },
  { to: '/configuracoes/salas', label: 'Salas' },
  { to: '/configuracoes/telegram', label: 'Telegram' },
];

export function ConfiguracoesLayout() {
  return (
    <PageShell>
      <PageHeader title="Configurações" description="Gerencie usuários, departamentos, escalas e registros do portal." />

      <nav className="mb-6 flex flex-wrap gap-1 border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
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
