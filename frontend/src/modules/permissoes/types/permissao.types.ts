export interface Rotina {
  id: string;
  chave: string;
  nome: string;
  ativo: boolean;
}

export interface RotinaResumo {
  chave: string;
  nome: string;
}

export interface UserRotinaOverride {
  concedida: boolean;
  rotina: RotinaResumo;
}
