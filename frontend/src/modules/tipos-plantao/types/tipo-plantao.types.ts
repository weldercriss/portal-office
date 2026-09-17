export type RegraRecorrenciaPlantao = 'UNICO' | 'SEMANAL' | 'MENSAL';

export const REGRA_RECORRENCIA_LABEL: Record<RegraRecorrenciaPlantao, string> = {
  UNICO: 'Único',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal (mesmo dia)',
};

export interface TipoPlantao {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  regra: RegraRecorrenciaPlantao;
  /** 0=Dom..6=Sáb. Só relevante quando regra=SEMANAL. */
  diasSemana: number[];
  ativo: boolean;
  criadoEm: string;
}

export interface CreateTipoPlantaoInput {
  nome: string;
  horaInicio: string;
  horaFim: string;
  regra: RegraRecorrenciaPlantao;
  diasSemana?: number[];
}

export interface UpdateTipoPlantaoInput extends Partial<CreateTipoPlantaoInput> {
  ativo?: boolean;
}
