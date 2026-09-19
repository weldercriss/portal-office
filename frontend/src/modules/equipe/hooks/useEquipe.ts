import { useQuery } from '@tanstack/react-query';
import { getMinhaEquipe, getResumoEquipe } from '../api/equipe.api';

export function useMinhaEquipe() {
  return useQuery({ queryKey: ['minha-equipe'], queryFn: getMinhaEquipe });
}

export function useResumoEquipe() {
  return useQuery({ queryKey: ['dashboard', 'equipe'], queryFn: getResumoEquipe });
}
