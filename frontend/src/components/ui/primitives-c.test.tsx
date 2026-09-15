import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';
import { FormField } from './Form';
import { Select } from './Select';

describe('UI primitives — batch C', () => {
  it('Select renders its options and fires onChange', async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Tipo de status" onChange={onChange}>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    await userEvent.selectOptions(screen.getByLabelText('Tipo de status'), 'b');
    expect(onChange).toHaveBeenCalled();
  });

  it('Dialog only renders its content when open', () => {
    const { rerender } = render(
      <Dialog open={false} onOpenChange={() => {}} title="Novo status">
        conteúdo
      </Dialog>,
    );
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();

    rerender(
      <Dialog open onOpenChange={() => {}} title="Novo status">
        conteúdo
      </Dialog>,
    );
    expect(screen.getByRole('dialog', { name: 'Novo status' })).toBeInTheDocument();
  });

  it('Dialog calls onOpenChange(false) on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Novo status">
        conteúdo
      </Dialog>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('FormField renders the label and an error message', () => {
    render(
      <FormField label="Nome" htmlFor="nome" error="Campo obrigatório">
        <input id="nome" />
      </FormField>,
    );
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('Campo obrigatório')).toBeInTheDocument();
  });
});
