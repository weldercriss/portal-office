export interface DepartamentoResponsavel {
  id: string;
  nome: string;
}

export interface Departamento {
  id: string;
  nome: string;
  ativo: boolean;
  fazPlantao: boolean;
  responsavelId: string | null;
  responsavel: DepartamentoResponsavel | null;
}

export interface CreateDepartamentoInput {
  nome: string;
  fazPlantao?: boolean;
  responsavelId?: string | null;
}

export interface UpdateDepartamentoInput {
  nome?: string;
  ativo?: boolean;
  fazPlantao?: boolean;
  responsavelId?: string | null;
}
