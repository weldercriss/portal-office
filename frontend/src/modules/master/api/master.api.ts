import { httpClient } from '../../../api/httpClient';
import type { CreateMasterUsuarioInput, MasterUsuario } from '../types/master.types';

const BASE = '/users/masters';

export function getMasterUsuarios() {
  return httpClient<MasterUsuario[]>(BASE);
}

export function createMasterUsuario(input: CreateMasterUsuarioInput) {
  return httpClient<MasterUsuario>(BASE, { method: 'POST', body: input });
}
