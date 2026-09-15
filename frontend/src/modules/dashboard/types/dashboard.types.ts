export interface DashboardDepartamentoTotal {
  departamentoId: string | null;
  departamento: string;
  total: number;
}

export interface DashboardAniversariante {
  id: string;
  nome: string;
  data: string;
  dias: number;
}

export interface DashboardAniversarioCasa extends DashboardAniversariante {
  anos: number;
}

export interface DashboardAgendamentoProximo {
  id: string;
  sala: string;
  solicitante: string;
  /** ISO do dia em UTC: use sempre os primeiros 10 caracteres. */
  data: string;
  horaInicio: string;
  horaFim: string;
}

export interface DashboardAgendamentos {
  /** Reservas SOLICITADA, ainda sem confirmação. */
  pendentes: number;
  /** CONFIRMADA de hoje e amanhã, mais próxima primeiro. */
  proximas: DashboardAgendamentoProximo[];
}

export interface DashboardResumoAdmin {
  totalColaboradores: number;
  porDepartamento: DashboardDepartamentoTotal[];
  proximosAniversariantes: DashboardAniversariante[];
  proximosAniversariosCasa: DashboardAniversarioCasa[];
  agendamentos: DashboardAgendamentos;
}
