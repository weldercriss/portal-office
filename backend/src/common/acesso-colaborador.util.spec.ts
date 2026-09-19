import { ForbiddenException } from '@nestjs/common';
import { garantirAcessoColaborador } from './acesso-colaborador.util';

describe('garantirAcessoColaborador', () => {
  it('permite admin acessar qualquer alvo', () => {
    expect(() => garantirAcessoColaborador({ id: 'admin1', role: 'ADMIN' }, 'outro', null)).not.toThrow();
  });

  it('permite o próprio colaborador acessar seus dados', () => {
    expect(() => garantirAcessoColaborador({ id: 'u1', role: 'USER' }, 'u1', null)).not.toThrow();
  });

  it('permite GESTOR acessar liderado direto', () => {
    expect(() => garantirAcessoColaborador({ id: 'gestor1', role: 'GESTOR' }, 'liderado1', 'gestor1')).not.toThrow();
  });

  it('nega GESTOR acessar quem não é liderado direto', () => {
    expect(() => garantirAcessoColaborador({ id: 'gestor1', role: 'GESTOR' }, 'outro', 'outro-gestor')).toThrow(
      ForbiddenException,
    );
  });

  it('nega USER acessar dados de outro colaborador', () => {
    expect(() => garantirAcessoColaborador({ id: 'u1', role: 'USER' }, 'u2', null)).toThrow(ForbiddenException);
  });
});
