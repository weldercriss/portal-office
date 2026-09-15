export interface NavItem {
  to: string;
  label: string;
  /** Nome do arquivo em public/assets/svg. */
  icon: string;
  end?: boolean;
  adminOnly?: boolean;
  /** Chave de rotina exigida (ver backend/src/permissoes). Ausente = sempre visível. */
  rotina?: string;
}

/** Itens do rail, na ordem em que aparecem. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true, rotina: 'dashboard' },
  { to: '/plantoes', label: 'Plantões', icon: 'calendar', end: true, rotina: 'plantoes', adminOnly: true },
  { to: '/agendamentos', label: 'Agendamentos', icon: 'grid', end: true, rotina: 'agendamentos' },
  { to: '/solicitacoes', label: 'Solicitações', icon: 'requests', end: true, rotina: 'solicitacoes' },
  { to: '/convites-agenda', label: 'Convites de agenda', icon: 'calendar', end: true, adminOnly: true },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings', adminOnly: true },
];
