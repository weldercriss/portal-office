import { httpClient } from '../../../api/httpClient';
import type { ColaboradorResumoDocumentos } from '../types/central-documentos.types';

export const getResumoDocumentos = () => httpClient<ColaboradorResumoDocumentos[]>('/documentos/resumo');
