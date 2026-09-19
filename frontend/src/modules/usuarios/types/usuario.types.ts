import type { UserRole } from '../../../types/auth.types';

export interface Grupo {
  id: string;
  nome: string;
  fazPlantao: boolean;
}

export interface SubAreaResumo {
  id: string;
  nome: string;
}

export interface GestorResumo {
  id: string;
  nome: string;
}

export type StatusColaborador = 'PENDENTE' | 'ATIVO' | 'AFASTADO' | 'FERIAS' | 'DESLIGADO';

export const STATUS_COLABORADOR: { value: StatusColaborador; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente de autorização' },
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'AFASTADO', label: 'Afastado' },
  { value: 'FERIAS', label: 'Férias' },
  { value: 'DESLIGADO', label: 'Desligado' },
];

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  groupId: string | null;
  ativo: boolean;
  acessoPlataforma: boolean;
  criadoEm: string;
  googleLinkedAt: string | null;
  avatarUrl: string | null;
  dataNascimento: string | null;
  dataAdmissao: string | null;
  telefone: string | null;
  telegramUsername: string | null;
  telegramChatId: string | null;
  recebeAvisosRH: boolean;
  subAreaId: string | null;
  senioridade: string | null;
  cargo: string | null;
  gestorId: string | null;
  salario: string | null;
  beneficios: string | null;
  statusColaborador: StatusColaborador;
  dataDesligamento: string | null;
  motivoDesligamento: string | null;
  bancoNome: string | null;
  bancoAgencia: string | null;
  bancoConta: string | null;
  bancoTipoConta: string | null;
  group: Grupo | null;
  subArea: SubAreaResumo | null;
  gestor: GestorResumo | null;
  /** Só vem preenchido em GET /users/:id e /users/me (rotinas resolvidas: departamento + overrides). */
  rotinas?: string[];
}

export interface CreateUsuarioInput {
  nome: string;
  email: string;
  senha?: string;
  acessoPlataforma?: boolean;
  role: UserRole;
  groupId?: string;
  dataNascimento?: string;
  dataAdmissao?: string;
  telefone?: string;
  telegramUsername: string;
  telegramChatId?: string;
  recebeAvisosRH?: boolean;
  subAreaId?: string;
  senioridade?: string;
  cargo?: string;
  gestorId?: string;
  salario?: string;
  beneficios?: string;
  statusColaborador?: StatusColaborador;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  bancoTipoConta?: string;
}

export type UpdateUsuarioInput = Partial<CreateUsuarioInput> & { ativo?: boolean };

export type UsuarioCriado = Usuario & { senhaGerada?: string };
