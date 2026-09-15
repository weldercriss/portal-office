import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/colaborador-rh.api';
import type {
  CreateDependenteInput,
  CreateHistoricoInput,
  TipoDocumentoColaborador,
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

// Checklist
export function useChecklist(userId: string) {
  return useQuery({ queryKey: ['checklist', userId], queryFn: () => api.getChecklist(userId), enabled: !!userId });
}
export function useGerarChecklistPadrao(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.gerarChecklistPadrao(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId] }),
  });
}
export function useCreateChecklistItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (titulo: string) => api.createChecklistItem(userId, titulo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId] }),
  });
}
export function useUpdateChecklistItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'PENDENTE' | 'CONCLUIDO' }) =>
      api.updateChecklistItem(userId, id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId] }),
  });
}
export function useDeleteChecklistItem(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteChecklistItem(userId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['checklist', userId] }),
  });
}

// Documentos
export function useDocumentos(userId: string) {
  return useQuery({ queryKey: ['documentos', userId], queryFn: () => api.getDocumentos(userId), enabled: !!userId });
}
export function useUploadDocumento(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { nome: string; tipo: TipoDocumentoColaborador; validade?: string; arquivo: File }) =>
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

