import { NavLink, Outlet } from 'react-router-dom';
import { PageShell } from '../../components/system/PageShell';
import { PageHeader } from '../../components/ui/PageHeader';

const TABS = [
  { to: '/relatorios/colaboradores', label: 'Colaboradores' },
  { to: '/relatorios/turnover', label: 'Turnover' },
  { to: '/relatorios/pesquisas', label: 'Pesquisas' },
];

export function RelatoriosLayout() {
  return (
    <PageShell>
      <PageHeader title="Relatórios" description="Indicadores e relatórios do portal." />

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
