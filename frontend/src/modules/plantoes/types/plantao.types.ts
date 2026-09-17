import type { RegraRecorrenciaPlantao } from '../../tipos-plantao/types/tipo-plantao.types';

export type PlantaoStatus = 'RASCUNHO' | 'PUBLICADO' | 'CANCELADO';
export type TrocaStatus = 'PENDENTE' | 'ACEITA' | 'REJEITADA';

export interface PlantaoUsuarioResumo {
  id: string;
  nome: string;
  email?: string;
}

export interface PlantaoTipoResumo {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  regra: RegraRecorrenciaPlantao;
}

export interface Plantao {
  id: string;
  nome: string | null;
  data: string;
  userId: string | null;
  user: PlantaoUsuarioResumo | null;
  criadoPorId: string;
  criadoPor: PlantaoUsuarioResumo;
  status: PlantaoStatus;
  tipoPlantaoId: string | null;
  tipoPlantao: PlantaoTipoResumo | null;
  serieId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CreatePlantaoInput {
  nome?: string;
  data: string;
  userId?: string | null;
  status?: PlantaoStatus;
  tipoPlantaoId: string;
}

export type UpdatePlantaoInput = Partial<CreatePlantaoInput>;

export interface TrocaPlantao {
  id: string;
  plantaoOrigemId: string;
  plantaoOrigem: Plantao;
  plantaoDestinoId: string;
  plantaoDestino: Plantao;
  solicitanteId: string;
  solicitante: PlantaoUsuarioResumo;
  destinatarioId: string;
  destinatario: PlantaoUsuarioResumo;
  status: TrocaStatus;
  criadoEm: string;
  respondidoEm: string | null;
}
