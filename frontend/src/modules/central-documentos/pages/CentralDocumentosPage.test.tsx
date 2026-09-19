import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CentralDocumentosPage from './CentralDocumentosPage';
import type { ColaboradorResumoDocumentos } from '../types/central-documentos.types';
import type { DocumentoColaborador } from '../../colaboradores-rh/types/colaborador-rh.types';

const COLABORADOR: ColaboradorResumoDocumentos = {
  id: 'u1',
  nome: 'Ana Souza',
  avatarUrl: null,
  group: { id: 'g1', nome: 'Financeiro' },
  _count: { documentos: 1 },
};

const DOCUMENTO: DocumentoColaborador = {
  id: 'd1',
  userId: 'u1',
  categoriaId: 'c1',
  categoria: { id: 'c1', nome: 'Contrato' },
  nome: 'Contrato assinado',
  arquivoNome: 'contrato.pdf',
  validade: null,
  competencia: null,
  criadoPorId: 'admin1',
  criadoEm: '2026-09-01T00:00:00.000Z',
};

const uploadMutation = { mutateAsync: vi.fn().mockResolvedValue(DOCUMENTO), isPending: false };
const deleteMutation = { mutate: vi.fn(), isPending: false };

vi.mock('../hooks/useCentralDocumentos', () => ({
  useResumoDocumentos: () => ({ data: [COLABORADOR], isLoading: false, isError: false, refetch: vi.fn() }),
}));

vi.mock('../../colaboradores-rh/hooks/useColaboradorRh', () => ({
  useDocumentos: () => ({ data: [DOCUMENTO], isLoading: false }),
  useUploadDocumento: () => uploadMutation,
  useDeleteDocumento: () => deleteMutation,
}));

vi.mock('../../categorias-documento/hooks/useCategoriasDocumento', () => ({
  useCategoriasDocumento: () => ({ data: [{ id: 'c1', nome: 'Contrato' }] }),
}));

describe('CentralDocumentosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function navegarAteColaborador() {
    render(<CentralDocumentosPage />);
    await userEvent.click(screen.getByText('Financeiro'));
    await userEvent.click(screen.getByText('Ana Souza'));
  }

  it('exclui um documento diretamente pela Central', async () => {
    await navegarAteColaborador();
    await userEvent.click(screen.getByRole('button', { name: /Contrato/ }));
    await userEvent.click(screen.getByLabelText('Excluir Contrato assinado'));
    expect(deleteMutation.mutate).toHaveBeenCalledWith('d1');
  });

  it('envia um novo documento com categoria e arquivo selecionados', async () => {
    await navegarAteColaborador();
    await userEvent.click(screen.getByText('Contrato'));

    const arquivo = new File(['conteudo'], 'novo.pdf', { type: 'application/pdf' });
    await userEvent.selectOptions(screen.getByLabelText('Categoria'), 'c1');
    await userEvent.upload(screen.getByLabelText('Arquivo'), arquivo);
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));

    expect(uploadMutation.mutateAsync).toHaveBeenCalledWith({ nome: 'novo.pdf', categoriaId: 'c1', arquivo });
  });
});
