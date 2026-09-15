export type ReservaStatus = 'SOLICITADA' | 'CONFIRMADA' | 'CANCELADA';
export type ReservaDestinatarios = 'SOLICITANTE' | 'RESPONSAVEL' | 'AMBOS';

/** 0 = domingo, na mesma convenção de `Date.getUTCDay()` usada pelo backend. */
export const DIAS_SEMANA: { value: number; label: string; curto: string }[] = [
  { value: 0, label: 'Domingo', curto: 'Dom' },
  { value: 1, label: 'Segunda', curto: 'Seg' },
  { value: 2, label: 'Terça', curto: 'Ter' },
  { value: 3, label: 'Quarta', curto: 'Qua' },
  { value: 4, label: 'Quinta', curto: 'Qui' },
  { value: 5, label: 'Sexta', curto: 'Sex' },
  { value: 6, label: 'Sábado', curto: 'Sáb' },
];

export const STATUS_RESERVA: { value: ReservaStatus; label: string }[] = [
  { value: 'SOLICITADA', label: 'Solicitada' },
  { value: 'CONFIRMADA', label: 'Confirmada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

export interface Disponibilidade {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  duracaoMinutos: number;
}

export interface Sala {
  id: string;
  nome: string;
  localizacao: string | null;
  capacidade: number | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  disponibilidades: Disponibilidade[];
}

export interface CreateSalaInput {
  nome: string;
  /** String vazia limpa o campo; ausente preserva o valor atual. */
  localizacao?: string;
  capacidade?: number | null;
  observacoes?: string;
  /** Ausente preserva a grade atual; presente substitui a grade inteira. */
  disponibilidades?: Omit<Disponibilidade, 'id'>[];
}

export interface UpdateSalaInput extends Partial<CreateSalaInput> {
  ativo?: boolean;
}

/** Horário oferecido pela sala num dia, já sabendo se alguém o tomou. */
export interface HorarioDisponivel {
  horaInicio: string;
  horaFim: string;
  disponivel: boolean;
}

export interface Reserva {
  id: string;
  salaId: string;
  sala: { id: string; nome: string; localizacao: string | null };
  solicitanteId: string;
  solicitante: { id: string; nome: string; email: string };
  responsavelId: string | null;
  responsavel: { id: string; nome: string; email: string } | null;
  destinatariosNotificacao: ReservaDestinatarios;
  registradoPor: { id: string; nome: string };
  /** ISO do dia em UTC: use sempre os primeiros 10 caracteres. */
  data: string;
  horaInicio: string;
  horaFim: string;
  titulo: string | null;
  observacoes: string | null;
  status: ReservaStatus;
  motivoCancelamento: string | null;
  canceladoEm: string | null;
  /** Falso pula o aviso por Telegram (criação, confirmação, cancelamento, lembrete). */
  notificarTelegram: boolean;
  criadoEm: string;
}

export interface CreateReservaInput {
  salaId: string;
  solicitanteId: string;
  responsavelId?: string | null;
  destinatariosNotificacao?: ReservaDestinatarios;
  data: string;
  horaInicio: string;
  horaFim: string;
  titulo?: string;
  observacoes?: string;
  status?: ReservaStatus;
  notificarTelegram?: boolean;
}

export type UpdateReservaInput = Partial<CreateReservaInput> & { motivoCancelamento?: string };

export interface FiltrosReserva {
  salaId?: string;
  solicitanteId?: string;
  status?: ReservaStatus;
  from?: string;
  to?: string;
}
