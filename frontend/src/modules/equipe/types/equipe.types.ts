export interface LideradoResumo {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
  avatarUrl: string | null;
  statusColaborador: 'ATIVO' | 'AFASTADO' | 'FERIAS' | 'DESLIGADO';
}

export interface EquipeAniversariante {
  id: string;
  nome: string;
  data: string;
  dias: number;
}

export interface ResumoEquipe {
  totalLiderados: number;
  proximosAniversariantes: EquipeAniversariante[];
  checklistPendente: number;
}
