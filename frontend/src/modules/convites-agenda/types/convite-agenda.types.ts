/** Modo legado: uma cópia do evento por destinatário conectado. Toda criação nova usa o outro modo. */
export type ConviteAgendaModo = 'COPIAS_INDIVIDUAIS' | 'EVENTO_COM_CONVIDADOS';

/** Andamento do evento único (modo EVENTO_COM_CONVIDADOS). */
export type ConviteAgendaEventoStatus = 'PENDENTE' | 'ENVIADO' | 'FALHA' | 'CANCELADO';

/** Andamento de uma cópia individual (modo legado, COPIAS_INDIVIDUAIS). */
export type ConviteAgendaStatus = 'CRIADO' | 'INDISPONIVEL' | 'FALHA' | 'CANCELADO';

/** RSVP do destinatário no evento único. */
export type ConviteAgendaResposta = 'PENDENTE' | 'ACEITO' | 'RECUSADO' | 'TALVEZ' | 'DESCONHECIDO';

export type DisponibilidadeStatus = 'LIVRE' | 'OCUPADO' | 'DESCONHECIDO';

export const STATUS_EVENTO_CONVITE: { value: ConviteAgendaEventoStatus; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'ENVIADO', label: 'Enviado' },
  { value: 'FALHA', label: 'Falha' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const STATUS_CONVITE_DESTINATARIO: { value: ConviteAgendaStatus; label: string }[] = [
  { value: 'CRIADO', label: 'Criado' },
  { value: 'INDISPONIVEL', label: 'Indisponível' },
  { value: 'FALHA', label: 'Falha' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export const RESPOSTA_CONVITE: { value: ConviteAgendaResposta; label: string }[] = [
  { value: 'PENDENTE', label: 'Pendente' },
  { value: 'ACEITO', label: 'Aceito' },
  { value: 'RECUSADO', label: 'Recusado' },
  { value: 'TALVEZ', label: 'Talvez' },
  { value: 'DESCONHECIDO', label: 'Desconhecido' },
];

export interface ColaboradorParaConvite {
  id: string;
  nome: string;
  email: string;
}

export interface OrganizadorStatus {
  conectado: boolean;
  email: string | null;
  precisaReconectar: boolean;
  podeConsultarDisponibilidade: boolean;
}

export interface DisponibilidadeEmail {
  email: string;
  status: DisponibilidadeStatus;
  ocupado: { inicio: string; fim: string }[];
}

export interface ConviteAgendaDestinatario {
  id: string;
  userId: string | null;
  user: { id: string; nome: string; email: string } | null;
  email: string;
  nome: string | null;
  /** Só preenchido em registros legados (modo COPIAS_INDIVIDUAIS). */
  status: ConviteAgendaStatus | null;
  erro: string | null;
  resposta: ConviteAgendaResposta;
  respondidoEm: string | null;
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
  modo: ConviteAgendaModo;
  /** Decidido na criação; edição não muda se o evento pede link do Google Meet. */
  comMeet: boolean;
  statusEvento: ConviteAgendaEventoStatus | null;
  organizadorEmail: string | null;
  enviadoEm: string | null;
  canceladoEm: string | null;
  respostasSincronizadasEm: string | null;
}

export interface CreateConviteAgendaInput {
  titulo: string;
  descricao?: string;
  local?: string;
  inicio: string;
  fim: string;
  destinatarioEmails: string[];
  /** Padrão true (o evento pede link do Google Meet). Não editável depois de criado. */
  comMeet?: boolean;
}

/** Destinatários não mudam aqui — só os dados do evento. */
export type UpdateConviteAgendaInput = Partial<Omit<CreateConviteAgendaInput, 'destinatarioEmails'>>;

export interface VerificarConviteAgendaInput {
  inicio: string;
  fim: string;
  destinatarioEmails: string[];
}
