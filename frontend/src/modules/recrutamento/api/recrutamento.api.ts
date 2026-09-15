import { httpClient, httpClientBlob } from '../../../api/httpClient';
import type {
  Candidato,
  ConverterCandidatoInput,
  CreateCandidatoInput,
  CreateEntrevistaInput,
  CreateVagaInput,
  Entrevista,
  UpdateCandidatoInput,
  UpdateVagaInput,
  Vaga,
} from '../types/recrutamento.types';
import type { Usuario } from '../../usuarios/types/usuario.types';

export const getVagas = () => httpClient<Vaga[]>('/vagas');
export const createVaga = (input: CreateVagaInput) => httpClient<Vaga>('/vagas', { method: 'POST', body: input });
export const updateVaga = (id: string, input: UpdateVagaInput) =>
  httpClient<Vaga>(`/vagas/${id}`, { method: 'PATCH', body: input });
export const deleteVaga = (id: string) => httpClient<{ success: boolean }>(`/vagas/${id}`, { method: 'DELETE' });

export const getCandidatosDaVaga = (vagaId: string) => httpClient<Candidato[]>(`/vagas/${vagaId}/candidatos`);
export const createCandidato = (vagaId: string, input: CreateCandidatoInput) =>
  httpClient<Candidato>(`/vagas/${vagaId}/candidatos`, { method: 'POST', body: input });
export const getCandidato = (id: string) => httpClient<Candidato>(`/candidatos/${id}`);
export const updateCandidato = (id: string, input: UpdateCandidatoInput) =>
  httpClient<Candidato>(`/candidatos/${id}`, { method: 'PATCH', body: input });
export const deleteCandidato = (id: string) => httpClient<{ success: boolean }>(`/candidatos/${id}`, { method: 'DELETE' });

export const anexarCurriculo = (id: string, arquivo: File) => {
  const formData = new FormData();
  formData.set('curriculo', arquivo);
  return httpClient<Candidato>(`/candidatos/${id}/curriculo`, { method: 'POST', body: formData });
};
export const baixarCurriculo = (id: string) => httpClientBlob(`/candidatos/${id}/curriculo`);

export const createEntrevista = (candidatoId: string, input: CreateEntrevistaInput) =>
  httpClient<Entrevista>(`/candidatos/${candidatoId}/entrevistas`, { method: 'POST', body: input });

export const converterEmColaborador = (candidatoId: string, input: ConverterCandidatoInput) =>
  httpClient<Usuario & { senhaGerada?: string }>(`/candidatos/${candidatoId}/converter-em-colaborador`, {
    method: 'POST',
    body: input,
  });
