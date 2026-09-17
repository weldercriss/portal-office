export type EstadoEquipamento = 'NOVO' | 'BOM' | 'REGULAR' | 'RUIM' | 'DANIFICADO';
export type EquipamentoStatus = 'EM_COMPRA' | 'AGUARDANDO_CHEGADA' | 'ESTOQUE' | 'EM_USO' | 'MANUTENCAO' | 'BAIXADO';
export type AlocacaoStatus = 'PENDENTE' | 'ENTREGUE' | 'ASSINADO' | 'DEVOLVIDO' | 'CANCELADA';

export const ESTADO_EQUIPAMENTO_LABEL: Record<EstadoEquipamento, string> = {
  NOVO: 'Novo',
  BOM: 'Bom',
  REGULAR: 'Regular',
  RUIM: 'Ruim',
  DANIFICADO: 'Danificado',
};

export const EQUIPAMENTO_STATUS_LABEL: Record<EquipamentoStatus, string> = {
  EM_COMPRA: 'Em compra',
  AGUARDANDO_CHEGADA: 'Aguardando chegada',
  ESTOQUE: 'Estoque',
  EM_USO: 'Em uso',
  MANUTENCAO: 'Manutenção',
  BAIXADO: 'Baixado',
};

export const ALOCACAO_STATUS_LABEL: Record<AlocacaoStatus, string> = {
  PENDENTE: 'Pendente',
  ENTREGUE: 'Entregue',
  ASSINADO: 'Assinado',
  DEVOLVIDO: 'Devolvido',
  CANCELADA: 'Cancelada',
};

export interface TipoEquipamento {
  id: string;
  nome: string;
  descricao: string | null;
  exigeTermo: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  _count: { equipamentos: number };
}

export interface CreateTipoEquipamentoInput {
  nome: string;
  descricao?: string;
  exigeTermo?: boolean;
}

export type UpdateTipoEquipamentoInput = Partial<CreateTipoEquipamentoInput> & { ativo?: boolean };

export interface ColaboradorResumo {
  id: string;
  nome: string;
  email: string;
  statusColaborador: string;
  ativo?: boolean;
}

export interface EquipamentoResumo {
  id: string;
  tipo: { id: string; nome: string; exigeTermo: boolean };
  numero: string | null;
  numeroSerie: string | null;
  marca: string | null;
  modelo: string | null;
}

export interface AlocacaoEquipamento {
  id: string;
  equipamentoId: string;
  equipamento?: EquipamentoResumo;
  colaboradorId: string;
  colaborador: ColaboradorResumo;
  dataInicio: string;
  dataDevolucao: string | null;
  status: AlocacaoStatus;
  estadoNaEntrega: EstadoEquipamento | null;
  estadoNaDevolucao: EstadoEquipamento | null;
  observacoes: string | null;
  motivoDevolucao: string | null;
  termoNome: string | null;
  termoCaminho: string | null;
  termoMimeType: string | null;
  termoEnviadoEm: string | null;
  registradoPorId: string;
  registradoPor?: { id: string; nome: string };
  criadoEm: string;
  atualizadoEm: string;
}

export interface Equipamento {
  id: string;
  tipoId: string;
  tipo: { id: string; nome: string; exigeTermo: boolean };
  numero: string | null;
  numeroSerie: string | null;
  marca: string | null;
  modelo: string | null;
  estado: EstadoEquipamento;
  status: EquipamentoStatus;
  dataAquisicao: string | null;
  valorAquisicao: string | null;
  observacoes: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  /** A API inclui só a alocação ativa (no máx. 1); vazio quando o item está livre. */
  alocacoes: AlocacaoEquipamento[];
}

export interface CreateEquipamentoInput {
  tipoId: string;
  numero?: string;
  numeroSerie?: string;
  marca?: string;
  modelo?: string;
  estado?: EstadoEquipamento;
  status?: EquipamentoStatus;
  dataAquisicao?: string;
  valorAquisicao?: number | null;
  observacoes?: string;
}

export type UpdateEquipamentoInput = Partial<CreateEquipamentoInput> & { ativo?: boolean };

export interface FiltrosEquipamento {
  tipoId?: string;
  status?: string;
  estado?: string;
  colaboradorId?: string;
  busca?: string;
  disponiveis?: boolean;
  all?: boolean;
}

export interface ResumoEquipamentos {
  total: number;
  porStatus: Record<EquipamentoStatus, number>;
}

export interface CreateAlocacaoInput {
  equipamentoId: string;
  colaboradorId: string;
  dataInicio: string;
  status?: AlocacaoStatus;
  estadoNaEntrega?: EstadoEquipamento;
  observacoes?: string;
}

export type UpdateAlocacaoInput = Partial<CreateAlocacaoInput>;

export interface DevolverAlocacaoInput {
  dataDevolucao?: string;
  estadoNaDevolucao?: EstadoEquipamento;
  motivoDevolucao?: string;
}

export interface FiltrosAlocacao {
  colaboradorId?: string;
  equipamentoId?: string;
  status?: string;
  ativas?: boolean;
}
