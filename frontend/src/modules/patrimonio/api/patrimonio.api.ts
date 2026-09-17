import { httpClient, httpClientBlob } from '../../../api/httpClient';
import type {
  AlocacaoEquipamento,
  CreateAlocacaoInput,
  CreateEquipamentoInput,
  CreateTipoEquipamentoInput,
  DevolverAlocacaoInput,
  Equipamento,
  FiltrosAlocacao,
  FiltrosEquipamento,
  ResumoEquipamentos,
  TipoEquipamento,
  UpdateAlocacaoInput,
  UpdateEquipamentoInput,
  UpdateTipoEquipamentoInput,
} from '../types/patrimonio.types';

function query(params: Record<string, string | boolean | undefined>): string {
  const usp = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === '') continue;
    usp.set(chave, String(valor));
  }
  const texto = usp.toString();
  return texto ? `?${texto}` : '';
}

// Tipos de equipamento
export const getTiposEquipamento = (all = false) =>
  httpClient<TipoEquipamento[]>(`/patrimonio/tipos${query({ all })}`);
export const createTipoEquipamento = (input: CreateTipoEquipamentoInput) =>
  httpClient<TipoEquipamento>('/patrimonio/tipos', { method: 'POST', body: input });
export const updateTipoEquipamento = (id: string, input: UpdateTipoEquipamentoInput) =>
  httpClient<TipoEquipamento>(`/patrimonio/tipos/${id}`, { method: 'PATCH', body: input });
export const deactivateTipoEquipamento = (id: string) =>
  httpClient<TipoEquipamento>(`/patrimonio/tipos/${id}`, { method: 'DELETE' });
export const deleteTipoEquipamentoPermanently = (id: string) =>
  httpClient<{ success: boolean }>(`/patrimonio/tipos/${id}/permanent`, { method: 'DELETE' });

// Equipamentos (inventário)
export const getEquipamentos = (filtros: FiltrosEquipamento = {}) =>
  httpClient<Equipamento[]>(`/patrimonio/equipamentos${query({ ...filtros })}`);
export const getResumoEquipamentos = () => httpClient<ResumoEquipamentos>('/patrimonio/equipamentos/resumo');
export const getEquipamento = (id: string) => httpClient<Equipamento>(`/patrimonio/equipamentos/${id}`);
export const createEquipamento = (input: CreateEquipamentoInput) =>
  httpClient<Equipamento>('/patrimonio/equipamentos', { method: 'POST', body: input });
export const updateEquipamento = (id: string, input: UpdateEquipamentoInput) =>
  httpClient<Equipamento>(`/patrimonio/equipamentos/${id}`, { method: 'PATCH', body: input });
export const deactivateEquipamento = (id: string) =>
  httpClient<Equipamento>(`/patrimonio/equipamentos/${id}`, { method: 'DELETE' });
export const deleteEquipamentoPermanently = (id: string) =>
  httpClient<{ success: boolean }>(`/patrimonio/equipamentos/${id}/permanent`, { method: 'DELETE' });

// Alocações (vínculo com colaboradores)
export const getAlocacoes = (filtros: FiltrosAlocacao = {}) =>
  httpClient<AlocacaoEquipamento[]>(`/patrimonio/alocacoes${query({ ...filtros })}`);
export const getMeusEquipamentos = (ativas = true) =>
  httpClient<AlocacaoEquipamento[]>(`/patrimonio/alocacoes/meus${query({ ativas })}`);
export const createAlocacao = (input: CreateAlocacaoInput) =>
  httpClient<AlocacaoEquipamento>('/patrimonio/alocacoes', { method: 'POST', body: input });
export const updateAlocacao = (id: string, input: UpdateAlocacaoInput) =>
  httpClient<AlocacaoEquipamento>(`/patrimonio/alocacoes/${id}`, { method: 'PATCH', body: input });
export const devolverAlocacao = (id: string, input: DevolverAlocacaoInput = {}) =>
  httpClient<AlocacaoEquipamento>(`/patrimonio/alocacoes/${id}/devolver`, { method: 'POST', body: input });
export const cancelarAlocacao = (id: string, motivoDevolucao?: string) =>
  httpClient<AlocacaoEquipamento>(`/patrimonio/alocacoes/${id}/cancelar`, {
    method: 'POST',
    body: { motivoDevolucao },
  });
export const devolverTudoDoColaborador = (colaboradorId: string, motivoDevolucao?: string) =>
  httpClient<{ devolvidas: number }>(`/patrimonio/alocacoes/colaborador/${colaboradorId}/devolver-tudo`, {
    method: 'POST',
    body: { motivoDevolucao },
  });
export const deleteAlocacao = (id: string) =>
  httpClient<{ success: boolean }>(`/patrimonio/alocacoes/${id}`, { method: 'DELETE' });

export const anexarTermo = (id: string, arquivo: File) => {
  const formData = new FormData();
  formData.set('termo', arquivo);
  return httpClient<AlocacaoEquipamento>(`/patrimonio/alocacoes/${id}/termo`, { method: 'POST', body: formData });
};
export const anexarTermoLote = (ids: string[], arquivo: File) => {
  const formData = new FormData();
  formData.set('ids', ids.join(','));
  formData.set('termo', arquivo);
  return httpClient<AlocacaoEquipamento[]>('/patrimonio/alocacoes/termo-lote', { method: 'POST', body: formData });
};
export const removerTermo = (id: string) =>
  httpClient<AlocacaoEquipamento>(`/patrimonio/alocacoes/${id}/termo`, { method: 'DELETE' });
export const baixarTermo = (id: string) => httpClientBlob(`/patrimonio/alocacoes/${id}/termo`);
