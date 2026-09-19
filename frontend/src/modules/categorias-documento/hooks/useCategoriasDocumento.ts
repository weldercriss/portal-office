import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/categoria-documento.api';
import type { CreateCategoriaDocumentoInput, UpdateCategoriaDocumentoInput } from '../types/categoria-documento.types';

export function useCategoriasDocumento(all = false) {
  return useQuery({ queryKey: ['categorias-documento', all], queryFn: () => api.getCategoriasDocumento(all) });
}

export function useCreateCategoriaDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoriaDocumentoInput) => api.createCategoriaDocumento(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-documento'] }),
  });
}

export function useUpdateCategoriaDocumento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoriaDocumentoInput }) =>
      api.updateCategoriaDocumento(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-documento'] }),
  });
}

export function useDeleteCategoriaDocumentoPermanently() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategoriaDocumentoPermanently(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias-documento'] }),
  });
}
