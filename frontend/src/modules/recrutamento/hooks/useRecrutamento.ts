import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/recrutamento.api';
import type {
  ConverterCandidatoInput,
  CreateCandidatoInput,
  CreateEntrevistaInput,
  CreateVagaInput,
  UpdateCandidatoInput,
  UpdateVagaInput,
} from '../types/recrutamento.types';

export function useVagas() {
  return useQuery({ queryKey: ['vagas'], queryFn: api.getVagas });
}
export function useCreateVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVagaInput) => api.createVaga(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  });
}
export function useUpdateVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateVagaInput }) => api.updateVaga(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  });
}
export function useDeleteVaga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteVaga(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vagas'] }),
  });
}

export function useCandidatosDaVaga(vagaId: string) {
  return useQuery({
    queryKey: ['candidatos', vagaId],
    queryFn: () => api.getCandidatosDaVaga(vagaId),
    enabled: !!vagaId,
  });
}
export function useCreateCandidato(vagaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCandidatoInput) => api.createCandidato(vagaId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos', vagaId] }),
  });
}
export function useUpdateCandidato(vagaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCandidatoInput }) => api.updateCandidato(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos', vagaId] }),
  });
}
export function useDeleteCandidato(vagaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCandidato(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos', vagaId] }),
  });
}
export function useAnexarCurriculo(vagaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) => api.anexarCurriculo(id, arquivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos', vagaId] }),
  });
}
export function useCreateEntrevista(vagaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidatoId, input }: { candidatoId: string; input: CreateEntrevistaInput }) =>
      api.createEntrevista(candidatoId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos', vagaId] }),
  });
}
export function useConverterEmColaborador(vagaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidatoId, input }: { candidatoId: string; input: ConverterCandidatoInput }) =>
      api.converterEmColaborador(candidatoId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidatos', vagaId] }),
  });
}
