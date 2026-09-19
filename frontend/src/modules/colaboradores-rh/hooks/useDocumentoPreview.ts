import { useState } from 'react';
import { baixarDocumento } from '../api/colaborador-rh.api';

export interface DocumentoPreview {
  url: string;
  nome: string;
  mimeType: string;
}

/** Baixa o arquivo e mantém o blob pronto pra visualização em modal, sem depender de aba nova. */
export function useDocumentoPreview() {
  const [preview, setPreview] = useState<DocumentoPreview | null>(null);

  async function abrir(userId: string, id: string, nome: string) {
    const blob = await baixarDocumento(userId, id);
    setPreview({ url: URL.createObjectURL(blob), nome, mimeType: blob.type });
  }

  function fechar() {
    setPreview((atual) => {
      if (atual) URL.revokeObjectURL(atual.url);
      return null;
    });
  }

  return { preview, abrir, fechar };
}
