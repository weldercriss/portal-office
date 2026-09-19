import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/colaborador-rh.api';
import type {
  CreateDependenteInput,
  CreateHistoricoInput,
  TipoChecklist,
  UpdateDadosSensiveisInput,
} from '../types/colaborador-rh.types';

// Dependentes
export function useDependentes(userId: string) {
  return useQuery({ queryKey: ['dependentes', userId], queryFn: () => api.getDependentes(userId), enabled: !!userId });
}
export function useCreateDependente(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDependenteInput) => api.createDependente(userId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependentes', userId] }),
  });
}
export function useDeleteDependente(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDependente(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dependentes', userId] }),
  });
}

// Histórico
export function useHistorico(userId: string) {
  return useQuery({ queryKey: ['historico', userId], queryFn: () => api.getHistorico(userId), enabled: !!userId });
}
export function useCreateHistorico(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHistoricoInput) => api.createHistorico(userId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['historico', userId] }),
  });
}
export function useDeleteHistorico(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteHistorico(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['historico', userId] }),
  });
}

// Checklist (admissão/desligamento)
export function useChecklist(userId: string, tipo: TipoChecklist) {
  return useQuery({
    queryKey: ['checklist', userId, tipo],
    queryFn: () => api.getChecklist(userId, tipo),
    enabled: !!userId,
  });
}
export function useGerarChecklistPadrao(userId: string, tipo: TipoChecklist) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.gerarChecklistPadrao(userId, tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId, tipo] }),
  });
}
export function useCreateChecklistItem(userId: string, tipo: TipoChecklist) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { titulo: string; categoria?: string }) => api.createChecklistItem(userId, { ...input, tipo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId, tipo] }),
  });
}
export function useUpdateChecklistItem(userId: string, tipo: TipoChecklist) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; status?: 'PENDENTE' | 'CONCLUIDO'; observacaoInterna?: string }) =>
      api.updateChecklistItem(userId, id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId, tipo] }),
  });
}
export function useDeleteChecklistItem(userId: string, tipo: TipoChecklist) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteChecklistItem(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId, tipo] }),
  });
}

// Documentos
export function useDocumentos(userId: string) {
  return useQuery({ queryKey: ['documentos', userId], queryFn: () => api.getDocumentos(userId), enabled: !!userId });
}
export function useUploadDocumento(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { nome: string; categoriaId: string; validade?: string; competencia?: string; arquivo: File }) =>
      api.uploadDocumento(userId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', userId] }),
  });
}
export function useDeleteDocumento(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDocumento(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documentos', userId] }),
  });
}

// Dados sensíveis (saúde e cultural)
export function useDadosSensiveis(userId: string) {
  return useQuery({
    queryKey: ['dados-sensiveis', userId],
    queryFn: () => api.getDadosSensiveis(userId),
    enabled: !!userId,
  });
}
export function useUpdateDadosSensiveis(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDadosSensiveisInput) => api.updateDadosSensiveis(userId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dados-sensiveis', userId] }),
  });
}

// Foto de perfil
export function useUploadAvatar(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (arquivo: File) => api.uploadAvatar(userId, arquivo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  });
}

