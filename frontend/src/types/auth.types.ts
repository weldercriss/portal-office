export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  rotinas: string[];
  /** Falso para quem entrou pelo Google e ainda não definiu uma senha. */
  temSenha?: boolean;
}
