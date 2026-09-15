import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TiposSolicitacaoAdminPage from './TiposSolicitacaoAdminPage';
import type { TipoSolicitacao } from '../types/tipo-solicitacao.types';

const createMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const updateMutation = { mutateAsync: vi.fn().mockResolvedValue({}), isPending: false };
const deleteMutation = { mutate: vi.fn(), isPending: false };

const tipo: TipoSolicitacao = {
  id: 't1',
  nome: 'Férias',
  ativo: true,
  requerAprovacao: true,
  contaComoAfastamento: true,
  ehFolga: false,
  usaFormulario: false,
  camposFormulario: null,
  permiteLinkPublico: false,
  tokenLinkPublico: null,
  criadoEm: '2026-09-01T00:00:00.000Z',
};

const tipoComLinkPublico: TipoSolicitacao = {
  ...tipo,
  id: 't2',
  nome: 'Reembolso',
  usaFormulario: true,
  camposFormulario: [{ id: 'c1', label: 'Motivo', tipo: 'TEXTO' }],
  permiteLinkPublico: true,
  tokenLinkPublico: 'token-abc',
};

vi.mock('../hooks/useTiposSolicitacao', () => ({
  useTiposSolicitacao: () => ({ data: [tipo, tipoComLinkPublico], isLoading: false, isError: false, refetch: vi.fn() }),
  useCreateTipoSolicitacao: () => createMutation,
  useUpdateTipoSolicitacao: () => updateMutation,
  useDeleteTipoSolicitacaoPermanently: () => deleteMutation,
}));

vi.mock('../hooks/useTemplatesFormulario', () => ({
  useTemplatesFormulario: () => ({ data: [] }),
  useCreateTemplateFormulario: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('TiposSolicitacaoAdminPage — formulário', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides the field editor until "Coleta dados via formulário" is checked', async () => {
    render(<TiposSolicitacaoAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo tipo' }));
    expect(screen.queryByRole('button', { name: 'Adicionar campo' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Coleta dados via formulário (permite configurar campos personalizados)'));
    expect(screen.getByRole('button', { name: 'Adicionar campo' })).toBeInTheDocument();
  });

  it('saves a configured field with a generated id and usaFormulario true', async () => {
    render(<TiposSolicitacaoAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo tipo' }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Reembolso');
    await userEvent.click(screen.getByLabelText('Coleta dados via formulário (permite configurar campos personalizados)'));
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar campo' }));
    await userEvent.type(screen.getByPlaceholderText('Nome do campo'), 'Motivo');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(createMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        usaFormulario: true,
        camposFormulario: [expect.objectContaining({ label: 'Motivo', tipo: 'TEXTO' })],
      }),
    );
  });

  it('hides the public link option until the type uses a form', async () => {
    render(<TiposSolicitacaoAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Novo tipo' }));
    expect(screen.queryByLabelText('Aceitar respostas por link público, sem login (como um Google Forms)')).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Coleta dados via formulário (permite configurar campos personalizados)'));
    expect(screen.getByLabelText('Aceitar respostas por link público, sem login (como um Google Forms)')).toBeInTheDocument();
  });

  it('shows the copyable public link when editing a type that already has one', async () => {
    render(<TiposSolicitacaoAdminPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Editar Reembolso' }));
    expect(screen.getByDisplayValue(/\/formulario-publico\/token-abc$/)).toBeInTheDocument();
  });
});
