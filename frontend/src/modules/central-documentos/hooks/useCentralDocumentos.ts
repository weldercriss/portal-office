import { useQuery } from '@tanstack/react-query';
import { getResumoDocumentos } from '../api/central-documentos.api';

export function useResumoDocumentos() {
  return useQuery({ queryKey: ['documentos', 'resumo'], queryFn: getResumoDocumentos });
}
