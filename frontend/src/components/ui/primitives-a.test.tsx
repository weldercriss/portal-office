import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';
import { Card } from './Card';
import { Label } from './Label';
import { PageHeader } from './PageHeader';
import { Skeleton } from './Skeleton';

describe('UI primitives — batch A', () => {
  it('Badge applies the neutral tone by default', () => {
    render(<Badge>Ativo</Badge>);
    expect(screen.getByText('Ativo')).toHaveClass('bg-[var(--color-surface-hover)]');
  });

  it('Badge applies the requested tone', () => {
    render(<Badge tone="success">Aprovada</Badge>);
    expect(screen.getByText('Aprovada')).toHaveClass('bg-[var(--color-success-soft)]');
  });

  it('Card renders with the shared card chrome', () => {
    render(<Card data-testid="card">conteúdo</Card>);
    expect(screen.getByTestId('card')).toHaveClass('rounded-card', 'border');
  });

  it('Skeleton renders a pulsing placeholder block', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('animate-pulse');
  });

  it('Label renders its text', () => {
    render(<Label htmlFor="x">Nome</Label>);
    expect(screen.getByText('Nome')).toBeInTheDocument();
  });

  it('PageHeader renders title, description and actions', () => {
    render(<PageHeader title="Painel" description="Status em tempo real" actions={<button>Novo</button>} />);
    expect(screen.getByRole('heading', { name: 'Painel' })).toBeInTheDocument();
    expect(screen.getByText('Status em tempo real')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });
});
