export type ConviteAgendaStatus = 'CRIADO' | 'INDISPONIVEL' | 'FALHA' | 'CANCELADO';

export const STATUS_CONVITE_DESTINATARIO: { value: ConviteAgendaStatus; label: string }[] = [
  { value: 'CRIADO', label: 'Criado' },
  { value: 'INDISPONIVEL', label: 'Indisponível' },
  { value: 'FALHA', label: 'Falha' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export interface ColaboradorParaConvite {
  id: string;
  nome: string;
  email: string;
  /** Falso quando a pessoa não conectou (ou desligou) a Agenda Google. */
  disponivel: boolean;
}

export interface ConflitoConvite {
  titulo: string;
  inicio: string | null;
  fim: string | null;
}

export interface VerificacaoDestinatario {
  userId: string;
  disponivel: boolean;
  conflitos: ConflitoConvite[];
}

export interface ConviteAgendaDestinatario {
  id: string;
  userId: string;
  user: { id: string; nome: string; email: string };
  status: ConviteAgendaStatus;
  erro: string | null;
}

export interface ConviteAgenda {
  id: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  inicio: string;
  fim: string;
  criadoPor: { id: string; nome: string };
  criadoEm: string;
  destinatarios: ConviteAgendaDestinatario[];
}

export interface CreateConviteAgendaInput {
  titulo: string;
  descricao?: string;
  local?: string;
  inicio: string;
  fim: string;
  destinatarioIds: string[];
}

/** Destinatários não mudam aqui — só os dados do evento. */
export type UpdateConviteAgendaInput = Partial<Omit<CreateConviteAgendaInput, 'destinatarioIds'>>;

export interface VerificarConviteAgendaInput {
  inicio: string;
  fim: string;
  destinatarioIds: string[];
}
