export type UserRole = 'ADMIN' | 'USER' | 'MASTER' | 'GESTOR';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  rotinas: string[];
  /** Falso para quem entrou pelo Google e ainda não definiu uma senha. */
  temSenha?: boolean;
  /** Foto da conta Google, quando o login foi feito por ela. */
  avatarUrl?: string | null;
}

const NIVEL_ROLE: Record<UserRole, number> = { USER: 0, GESTOR: 1, ADMIN: 2, MASTER: 3 };

/**
 * Hierarquia de papéis: MASTER satisfaz qualquer checagem de ADMIN, ADMIN a
 * de GESTOR, e GESTOR a de USER — nunca o contrário. Espelha
 * `backend/src/auth/roles.util.ts`.
 */
export function satisfazRole(role: UserRole | undefined | null, minimo: UserRole): boolean {
  if (!role) return false;
  return NIVEL_ROLE[role] >= NIVEL_ROLE[minimo];
}
