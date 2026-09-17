import { redigirColaborador } from './equipamentos.service';

const ALOCACAO = {
  colaboradorId: 'u1',
  colaborador: { id: 'u1', nome: 'Barbara', email: 'barbara@empresa.com' },
};

describe('redigirColaborador', () => {
  it('mantém a identidade para ADMIN', () => {
    expect(redigirColaborador(ALOCACAO, { id: 'admin1', role: 'ADMIN' })).toEqual(ALOCACAO);
  });

  it('mantém a identidade para o próprio colaborador', () => {
    expect(redigirColaborador(ALOCACAO, { id: 'u1', role: 'USER' })).toEqual(ALOCACAO);
  });

  it('some o nome e o e-mail para outro colaborador consultando o inventário', () => {
    const resultado = redigirColaborador(ALOCACAO, { id: 'u2', role: 'USER' });
    expect(resultado.colaboradorId).toBe('');
    expect(resultado.colaborador.nome).toBe('');
    expect(resultado.colaborador.email).toBe('');
  });

  it('não filtra quando não há usuário autenticado (uso interno de outros services)', () => {
    expect(redigirColaborador(ALOCACAO)).toEqual(ALOCACAO);
  });
});
