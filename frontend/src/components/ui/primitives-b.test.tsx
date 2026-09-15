import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Input } from './Input';

describe('UI primitives — batch B', () => {
  it('Button fires onClick and applies the primary variant by default', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button).toHaveClass('bg-[var(--color-primary-soft)]');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('Button is disabled when the disabled prop is set', () => {
    render(<Button disabled>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('Input accepts typed text', async () => {
    render(<Input placeholder="E-mail" />);
    const input = screen.getByPlaceholderText('E-mail');
    await userEvent.type(input, 'ana@portal-suporte.local');
    expect(input).toHaveValue('ana@portal-suporte.local');
  });
});
