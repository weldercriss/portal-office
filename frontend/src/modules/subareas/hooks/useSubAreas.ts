import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSubArea,
  deactivateSubArea,
  deleteSubAreaPermanently,
  getSubAreas,
  updateSubArea,
} from '../api/subareas.api';
import type { CreateSubAreaInput, UpdateSubAreaInput } from '../types/subarea.types';

const subAreasKey = (params?: { groupId?: string; all?: boolean }) => ['subareas', params ?? {}] as const;

export function useSubAreas(params?: { groupId?: string; all?: boolean }) {
  return useQuery({
    queryKey: subAreasKey(params),
    queryFn: () => getSubAreas(params),
    enabled: params?.groupId === undefined || Boolean(params.groupId),
  });
}

export function useCreateSubArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubAreaInput) => createSubArea(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subareas'] }),
  });
}

export function useUpdateSubArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubAreaInput }) => updateSubArea(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subareas'] }),
  });
}

export function useDeactivateSubArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateSubArea(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subareas'] }),
  });
}

export function useDeleteSubAreaPermanently() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSubAreaPermanently(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subareas'] }),
  });
}
