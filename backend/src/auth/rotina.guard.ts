import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissoesService } from '../permissoes/permissoes.service';
import { ROTINA_KEY } from './rotina.decorator';

@Injectable()
export class RotinaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissoesService: PermissoesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const chave = this.reflector.getAllAndOverride<string>(ROTINA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!chave) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Acesso não autorizado');

    const rotinas = await this.permissoesService.resolveRotinas(user.id);
    if (!rotinas.includes(chave)) {
      throw new ForbiddenException('Você não tem acesso a esta funcionalidade');
    }
    return true;
  }
}
