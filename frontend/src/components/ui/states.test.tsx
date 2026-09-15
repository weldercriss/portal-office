import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

describe('State components', () => {
  it('ErrorState shows the message and triggers retry', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Falha ao carregar" onRetry={onRetry} />);
    expect(screen.getByText('Falha ao carregar')).toBeInTheDocument();
    screen.getByText('Tentar novamente').click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('EmptyState shows title and description', () => {
    render(<EmptyState title="Nenhum colaborador ativo agora" description="Aguardando alguém entrar." />);
    expect(screen.getByText('Nenhum colaborador ativo agora')).toBeInTheDocument();
    expect(screen.getByText('Aguardando alguém entrar.')).toBeInTheDocument();
  });

  it('LoadingState renders the requested number of skeleton rows', () => {
    render(<LoadingState rows={4} />);
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(4);
  });
});
