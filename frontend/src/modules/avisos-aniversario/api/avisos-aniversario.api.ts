import { httpClient } from '../../../api/httpClient';
import type { ConfigAvisoAniversario } from '../types/avisos-aniversario.types';

const BASE = '/configuracoes/avisos-aniversario';

export const getConfigAvisoAniversario = () => httpClient<ConfigAvisoAniversario>(BASE);
export const updateConfigAvisoAniversario = (diasAntecedencia: number[]) =>
  httpClient<ConfigAvisoAniversario>(BASE, { method: 'PATCH', body: { diasAntecedencia } });
