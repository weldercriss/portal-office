export type RegraRecorrenciaPlantao = 'UNICO' | 'SEMANAL' | 'MENSAL';

export const REGRA_RECORRENCIA_LABEL: Record<RegraRecorrenciaPlantao, string> = {
  UNICO: 'Único',
  SEMANAL: 'Semanal',
  MENSAL: 'Mensal (mesmo dia)',
};

export interface TipoPlantao {
  id: string;
  nome: string;
  regra: RegraRecorrenciaPlantao;
  ativo: boolean;
  criadoEm: string;
}

export interface CreateTipoPlantaoInput {
  nome: string;
  regra: RegraRecorrenciaPlantao;
}

export interface UpdateTipoPlantaoInput extends Partial<CreateTipoPlantaoInput> {
  ativo?: boolean;
}
