import { httpClient } from '../../../api/httpClient';
import type { LideradoResumo, ResumoEquipe } from '../types/equipe.types';

export const getMinhaEquipe = () => httpClient<LideradoResumo[]>('/users/minha-equipe');
export const getResumoEquipe = () => httpClient<ResumoEquipe>('/dashboard/equipe');
