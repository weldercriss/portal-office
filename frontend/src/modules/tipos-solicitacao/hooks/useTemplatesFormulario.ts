import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTemplateFormulario,
  deleteTemplateFormulario,
  getTemplatesFormulario,
} from '../api/templates-formulario.api';
import type { CampoFormulario } from '../types/tipo-solicitacao.types';

const TEMPLATES_FORMULARIO_KEY = ['templates-formulario'] as const;

export function useTemplatesFormulario() {
  return useQuery({ queryKey: TEMPLATES_FORMULARIO_KEY, queryFn: getTemplatesFormulario });
}

export function useCreateTemplateFormulario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { nome: string; campos: CampoFormulario[] }) => createTemplateFormulario(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_FORMULARIO_KEY }),
  });
}

export function useDeleteTemplateFormulario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplateFormulario(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEMPLATES_FORMULARIO_KEY }),
  });
}
