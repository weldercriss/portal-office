export interface MasterUsuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: string;
}

export interface CreateMasterUsuarioInput {
  nome: string;
  email: string;
  senha: string;
}
