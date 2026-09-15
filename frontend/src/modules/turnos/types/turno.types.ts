export interface Turno {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
  criadoEm: string;
}

export interface CreateTurnoInput {
  nome: string;
  horaInicio: string;
  horaFim: string;
}

export interface UpdateTurnoInput extends Partial<CreateTurnoInput> {
  ativo?: boolean;
}
