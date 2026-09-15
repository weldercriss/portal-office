export interface SubArea {
  id: string;
  nome: string;
  ativo: boolean;
  groupId: string;
}

export interface CreateSubAreaInput {
  nome: string;
  groupId: string;
}

export interface UpdateSubAreaInput {
  nome?: string;
  ativo?: boolean;
  groupId?: string;
}
