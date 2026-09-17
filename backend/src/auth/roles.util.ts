export type AppRole = 'USER' | 'ADMIN' | 'MASTER';

const NIVEL_ROLE: Record<AppRole, number> = { USER: 0, ADMIN: 1, MASTER: 2 };

/**
 * Hierarquia de papéis: MASTER satisfaz qualquer checagem de ADMIN, e ADMIN
 * satisfaz qualquer checagem de USER — nunca o contrário. Usar em vez de
 * comparar `role === 'ADMIN'` diretamente, para o master herdar
 * automaticamente tudo que já é permitido a um administrador.
 */
export function satisfazRole(role: string | undefined | null, minimo: AppRole): boolean {
  const nivel = role && role in NIVEL_ROLE ? NIVEL_ROLE[role as AppRole] : -1;
  return nivel >= NIVEL_ROLE[minimo];
}

export function ehAdminOuSuperior(role: string | undefined | null): boolean {
  return satisfazRole(role, 'ADMIN');
}
