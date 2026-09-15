import { useQuery } from '@tanstack/react-query';
import { getResumoAdmin } from '../api/dashboard.api';

export function useResumoAdmin() {
  return useQuery({ queryKey: ['dashboard', 'admin'], queryFn: getResumoAdmin });
}
