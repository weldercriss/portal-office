import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ListToolbar } from './ListToolbar';
import { SearchField } from './SearchField';

describe('ListToolbar + SearchField', () => {
  it('SearchField reports typed value changes', async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Buscar status" />);
    await userEvent.type(screen.getByPlaceholderText('Buscar status'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('ListToolbar renders children and actions', () => {
    render(
      <ListToolbar actions={<button>Novo</button>}>
        <span>filtro</span>
      </ListToolbar>,
    );
    expect(screen.getByText('filtro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument();
  });
});
