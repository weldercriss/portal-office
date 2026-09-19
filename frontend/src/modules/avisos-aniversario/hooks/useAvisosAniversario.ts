import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getConfigAvisoAniversario, updateConfigAvisoAniversario } from '../api/avisos-aniversario.api';

const QUERY_KEY = ['config-aviso-aniversario'] as const;

export function useConfigAvisoAniversario() {
  return useQuery({ queryKey: QUERY_KEY, queryFn: getConfigAvisoAniversario });
}

export function useUpdateConfigAvisoAniversario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (diasAntecedencia: number[]) => updateConfigAvisoAniversario(diasAntecedencia),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
