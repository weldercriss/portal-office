export interface CategoriaDocumento {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: string;
  _count: { documentos: number };
}

export interface CreateCategoriaDocumentoInput {
  nome: string;
}

export type UpdateCategoriaDocumentoInput = Partial<CreateCategoriaDocumentoInput> & { ativo?: boolean };
