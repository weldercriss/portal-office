export interface NavItem {
  to: string;
  label: string;
  /** Nome do arquivo em public/assets/svg. */
  icon: string;
  end?: boolean;
  adminOnly?: boolean;
  /** Exclusivo do usuário master (administração de plataforma) — nem ADMIN vê. */
  masterOnly?: boolean;
  /** Exclusivo de quem tem o papel GESTOR — ADMIN/MASTER já têm o dashboard geral. */
  gestorOnly?: boolean;
  /** Chave de rotina exigida (ver backend/src/permissoes). Ausente = sempre visível. */
  rotina?: string;
}

/** Itens do rail, na ordem em que aparecem. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true, rotina: 'dashboard' },
  { to: '/minha-equipe', label: 'Minha equipe', icon: 'user', end: true, gestorOnly: true },
  { to: '/plantoes', label: 'Plantões', icon: 'calendar', end: true, rotina: 'plantoes', adminOnly: true },
  { to: '/agendamentos', label: 'Agendamentos', icon: 'agendamentos', end: true, rotina: 'agendamentos' },
  { to: '/solicitacoes', label: 'Solicitações', icon: 'requests', end: true, rotina: 'solicitacoes' },
  { to: '/patrimonio', label: 'Equipamentos', icon: 'equipamentos', end: true, rotina: 'patrimonio' },
  { to: '/pesquisas', label: 'Pesquisas', icon: 'pesquisas', end: true },
  { to: '/agenda', label: 'Convites de agenda', icon: 'meet', end: true, adminOnly: true },
  { to: '/central-documentos', label: 'Central de Documentos', icon: 'pasta', end: true, adminOnly: true },
  { to: '/relatorios', label: 'Relatórios', icon: 'relatorios', adminOnly: true },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings', adminOnly: true },
];
