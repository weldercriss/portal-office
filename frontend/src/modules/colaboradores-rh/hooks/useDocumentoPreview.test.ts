import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocumentoPreview } from './useDocumentoPreview';

const baixarDocumento = vi.fn();
vi.mock('../api/colaborador-rh.api', () => ({
  baixarDocumento: (userId: string, id: string) => baixarDocumento(userId, id),
}));

describe('useDocumentoPreview', () => {
  beforeEach(() => {
    baixarDocumento.mockReset();
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('baixa o arquivo e expõe url/mimeType pra pré-visualização', async () => {
    baixarDocumento.mockResolvedValue(new Blob(['conteudo'], { type: 'application/pdf' }));
    const { result } = renderHook(() => useDocumentoPreview());

    await act(async () => {
      await result.current.abrir('u1', 'd1', 'contrato.pdf');
    });

    expect(result.current.preview).toEqual({ url: 'blob:mock-url', nome: 'contrato.pdf', mimeType: 'application/pdf' });
  });

  it('revoga a url do blob ao fechar', async () => {
    baixarDocumento.mockResolvedValue(new Blob(['conteudo'], { type: 'application/pdf' }));
    const { result } = renderHook(() => useDocumentoPreview());

    await act(async () => {
      await result.current.abrir('u1', 'd1', 'contrato.pdf');
    });
    act(() => result.current.fechar());

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(result.current.preview).toBeNull();
  });
});
