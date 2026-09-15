import { httpClient } from '../../../api/httpClient';
import type { DashboardResumoAdmin } from '../types/dashboard.types';

export function getResumoAdmin() {
  return httpClient<DashboardResumoAdmin>('/dashboard/admin');
}
