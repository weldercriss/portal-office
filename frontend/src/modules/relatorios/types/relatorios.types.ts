export interface TurnoverMes {
  /** "AAAA-MM". */
  mes: string;
  admissoes: number;
  desligamentos: number;
}

export interface FiltroTurnover {
  de?: string;
  ate?: string;
  departamentoId?: string;
}

export interface RelatorioDepartamentoTotal {
  departamentoId: string | null;
  departamento: string;
  total: number;
}

export interface RelatorioAniversariante {
  id: string;
  nome: string;
  departamento: string;
  data: string;
}

export interface RelatorioAniversarioCasa extends RelatorioAniversariante {
  anos: number;
}

export interface RelatorioAniversariantesPorMes {
  /** 0=Janeiro..11=Dezembro. */
  mes: number;
  total: number;
}

export interface RelatorioColaboradores {
  totalColaboradores: number;
  porDepartamento: RelatorioDepartamentoTotal[];
  aniversariantesPorMes: RelatorioAniversariantesPorMes[];
  aniversariantes: RelatorioAniversariante[];
  aniversariosCasa: RelatorioAniversarioCasa[];
}
