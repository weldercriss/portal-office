import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

// Sem Client ID: o teste não depende do .env da máquina nem faz rede.
vi.mock('./config/env', () => ({
  API_BASE_URL: 'http://api.test',
  SOCKET_URL: 'http://api.test',
  GOOGLE_CLIENT_ID: '',
}));

describe('App', () => {
  it('renders the app placeholder', () => {
    render(<App />);
    expect(screen.getByText('Bem-vindo!')).toBeInTheDocument();
  });
});
