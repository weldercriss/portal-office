import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { SvgIcon } from '../../components/system/SvgIcon';
import { BRAND_MARK_ALT, BRAND_MARK_LIGHT, PRODUCT_NAME } from '../../config/brand';
import { APP_VERSION } from '../../lib/version';
import { NotificationBell } from '../../modules/notificacoes/components/NotificationBell';
import { useAuth } from '../../shared/auth/AuthContext';
import { satisfazRole } from '../../types/auth.types';
import { AppsMenu } from './AppsMenu';
import { NAV_ITEMS } from './navigation';
import { UserDropdown } from './UserDropdown';

/* Geometria do shell: itens de 40px (rail 64 − 2×12 de padding), gap de 8px,
   padding-top igual ao raio do painel de conteúdo. */
const RAIL_ITEM_CLASSES =
  'relative flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors duration-200 hover:bg-[var(--rail-hover)]';

/** Tooltip escuro que aparece à direita do item do rail no hover. */
function RailTooltip({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute left-[calc(100%+14px)] top-1/2 z-50 hidden -translate-y-1/2 items-center whitespace-nowrap rounded-lg bg-[var(--tooltip-bg)] px-3 py-2 text-sm font-medium leading-5 tracking-[-0.14px] text-white group-hover:flex">
      <div className="absolute -left-[6px] top-1/2 -translate-y-1/2 border-[6px] border-transparent border-r-[var(--tooltip-bg)]" />
      {label}
    </div>
  );
}

/**
 * Shell da aplicação: header e rail ficam fixos; só o painel de conteúdo rola.
 * `h-dvh` + `overflow-hidden` na raiz garantem que a página em si nunca role.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isAdmin = satisfazRole(user?.role, 'ADMIN');
  const isMaster = user?.role === 'MASTER';
  const isGestor = user?.role === 'GESTOR';
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.masterOnly) return isMaster;
    if (item.gestorOnly) return isGestor;
    if (item.adminOnly) return isAdmin;
    if (item.rotina) return isAdmin || Boolean(user?.rotinas.includes(item.rotina));
    return true;
  });

  return (
    <div className="flex h-dvh flex-col overflow-hidden text-[var(--color-text-primary)]">
      {/* ── Barra superior (full-width, cor de marca) ────────────────── */}
      <header className="z-50 flex h-[var(--shell-size)] shrink-0 items-center justify-between gap-3 bg-[var(--shell-header-bg)] px-4 text-white shadow-elegant">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to="/perfil" aria-label="Ir para o início" className="flex shrink-0 items-center rounded-xl">
            <img src={BRAND_MARK_LIGHT} alt={BRAND_MARK_ALT} className="h-9 w-9" />
          </Link>
          <span className="h-7 w-px shrink-0 bg-white/25" />
          <span className="truncate px-1.5 py-1 font-bricolage text-[20px] font-semibold leading-[30px] text-white">
            {PRODUCT_NAME}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-[var(--radius-pill)] border border-white/25 px-2.5 py-0.5 text-xs font-medium text-white/80 sm:inline">
            v{APP_VERSION}
          </span>
          <AppsMenu />
          <NotificationBell />
          <UserDropdown navItems={navItems} />
        </div>
      </header>

      {/* ── Rail lateral + painel de conteúdo ────────────────────────── */}
      <div className="flex min-h-0 flex-1 items-stretch bg-gradient-rail">
        <aside className="relative z-20 hidden w-[var(--shell-size)] shrink-0 overflow-hidden md:block">
          <nav className="flex h-full flex-col items-center gap-2 px-3 pb-3 pt-5" aria-label="Navegação principal">
            {navItems.map((item) => (
              <div key={item.to} className="group relative">
                <NavLink to={item.to} end={item.end} aria-label={item.label} className={RAIL_ITEM_CLASSES}>
                  {({ isActive }) => (
                    <>
                      <SvgIcon name={item.icon} className="h-6 w-6" />
                      {isActive && <span aria-hidden="true" className="rail-active-mark" />}
                    </>
                  )}
                </NavLink>
                <RailTooltip label={item.label} />
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Só este painel rola — o header e o rail ficam parados. */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)] shadow-elegant md:rounded-tl-[var(--shell-radius)] md:border-l md:border-white/10">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-clip [scrollbar-gutter:stable]">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
