export interface ColaboradorResumoDocumentos {
  id: string;
  nome: string;
  avatarUrl: string | null;
  group: { id: string; nome: string } | null;
  _count: { documentos: number };
}
