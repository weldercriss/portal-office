import { ForbiddenException } from '@nestjs/common';
import { ehAdminOuSuperior } from '../auth/roles.util';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

/**
 * Acesso self-or-admin aos dados de RH de um colaborador (histórico, checklist,
 * documentos), com um terceiro caso: GESTOR acessa quando o alvo é liderado
 * direto dele. Não é recursivo — só a relação `User.gestorId` direta.
 * `gestorIdDoAlvo` é o `User.gestorId` do alvo, já carregado por quem chama.
 */
export function garantirAcessoColaborador(
  usuarioLogado: UsuarioAutenticado,
  alvoId: string,
  gestorIdDoAlvo: string | null,
) {
  const ehLideradoDireto = usuarioLogado.role === 'GESTOR' && gestorIdDoAlvo === usuarioLogado.id;
  if (!ehAdminOuSuperior(usuarioLogado.role) && usuarioLogado.id !== alvoId && !ehLideradoDireto) {
    throw new ForbiddenException('Você não tem acesso aos dados deste colaborador');
  }
}
