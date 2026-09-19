import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { StatusColaborador, TipoChecklist } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { OnboardingService } from '../onboarding/onboarding.service';
import { AlocacoesService } from '../patrimonio/alocacoes.service';
import { PermissoesService } from '../permissoes/permissoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateMasterUserDto } from './dto/create-master-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

const SELECT_PUBLICO = {
  id: true,
  nome: true,
  email: true,
  role: true,
  groupId: true,
  ativo: true,
  acessoPlataforma: true,
  criadoEm: true,
  googleLinkedAt: true,
  avatarUrl: true,
  dataNascimento: true,
  dataAdmissao: true,
  telefone: true,
  telegramUsername: true,
  telegramChatId: true,
  recebeAvisosRH: true,
  senioridade: true,
  subAreaId: true,
  cargo: true,
  gestorId: true,
  salario: true,
  beneficios: true,
  statusColaborador: true,
  dataDesligamento: true,
  motivoDesligamento: true,
  bancoNome: true,
  bancoAgencia: true,
  bancoConta: true,
  bancoTipoConta: true,
  group: { select: { id: true, nome: true, fazPlantao: true } },
  subArea: { select: { id: true, nome: true } },
  gestor: { select: { id: true, nome: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissoesService: PermissoesService,
    private readonly alocacoesService: AlocacoesService,
    private readonly onboardingService: OnboardingService,
  ) {}

  /** Master é administração de plataforma, não colaborador — some da lista para quem não é master. */
  findAll(chamador: UsuarioAutenticado) {
    return this.prisma.user.findMany({
      where: chamador.role === 'MASTER' ? undefined : { role: { not: 'MASTER' } },
      select: SELECT_PUBLICO,
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string, chamador: UsuarioAutenticado) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_PUBLICO });
    // Mesmo erro do id inexistente: um master não deve nem confirmar que o id existe.
    if (!user || (user.role === 'MASTER' && chamador.role !== 'MASTER')) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const rotinas = await this.permissoesService.resolveRotinas(id);
    return { ...user, rotinas };
  }

  /** Equipe do gestor autenticado: só liderados diretos (gestorId), sem dado financeiro. */
  findMinhaEquipe(gestorId: string) {
    return this.prisma.user.findMany({
      where: { gestorId, ativo: true, statusColaborador: { not: 'PENDENTE' } },
      select: { id: true, nome: true, email: true, cargo: true, avatarUrl: true, statusColaborador: true },
      orderBy: { nome: 'asc' },
    });
  }

  findMasters() {
    return this.prisma.user.findMany({ where: { role: 'MASTER' }, select: SELECT_PUBLICO, orderBy: { nome: 'asc' } });
  }

  async createMaster(dto: CreateMasterUserDto) {
    const existente = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('E-mail já cadastrado');
    const senhaHash = await bcrypt.hash(dto.senha, 10);
    return this.prisma.user.create({
      data: { nome: dto.nome, email: dto.email, senhaHash, role: 'MASTER', ativo: true, acessoPlataforma: true },
      select: SELECT_PUBLICO,
    });
  }

  async findMe(id: string, chamador: UsuarioAutenticado) {
    const [usuario, credencial] = await Promise.all([
      this.findOne(id, chamador),
      this.prisma.user.findUnique({ where: { id }, select: { senhaHash: true } }),
    ]);
    // Quem entrou pelo Google ainda pode não ter senha definida.
    return { ...usuario, temSenha: (credencial?.senhaHash ?? '') !== '' };
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || !user.ativo || !user.acessoPlataforma) throw new NotFoundException('Usuário não encontrado');

    // Sem senha cadastrada (conta criada pelo Google), a primeira é definida direto.
    if (user.senhaHash) {
      const senhaAtualValida = dto.senhaAtual
        ? await bcrypt.compare(dto.senhaAtual, user.senhaHash)
        : false;
      if (!senhaAtualValida) throw new UnauthorizedException('Senha atual inválida');
    }

    const senhaHash = await bcrypt.hash(dto.novaSenha, 10);
    await this.prisma.user.update({ where: { id }, data: { senhaHash } });
    return { success: true };
  }

  async create(dto: CreateUserDto) {
    const existente = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existente) throw new ConflictException('E-mail já cadastrado');
    const acessoPlataforma = dto.acessoPlataforma ?? false;
    const senhaGerada = acessoPlataforma && !dto.senha ? randomBytes(9).toString('base64url') : undefined;
    const senhaHash = acessoPlataforma ? await bcrypt.hash(dto.senha ?? senhaGerada!, 10) : '';
    const usuario = await this.prisma.user.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        acessoPlataforma,
        role: dto.role,
        groupId: dto.groupId,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
        dataAdmissao: dto.dataAdmissao ? new Date(dto.dataAdmissao) : undefined,
        telefone: dto.telefone,
        telegramUsername: dto.telegramUsername,
        telegramChatId: dto.telegramChatId,
        recebeAvisosRH: dto.recebeAvisosRH,
        subAreaId: dto.subAreaId,
        senioridade: dto.senioridade,
        cargo: dto.cargo,
        gestorId: dto.gestorId,
        salario: dto.salario,
        beneficios: dto.beneficios,
        statusColaborador: dto.statusColaborador,
        bancoNome: dto.bancoNome,
        bancoAgencia: dto.bancoAgencia,
        bancoConta: dto.bancoConta,
        bancoTipoConta: dto.bancoTipoConta,
      },
      select: SELECT_PUBLICO,
    });
    return { ...usuario, senhaGerada };
  }

  async update(id: string, dto: UpdateUserDto, chamador: UsuarioAutenticado) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === 'MASTER' && chamador.role !== 'MASTER') throw new NotFoundException('Usuário não encontrado');

    // Desligar devolve ao estoque tudo que estava com a pessoa. Só na virada:
    // salvar de novo alguém que já estava desligado não mexe no histórico.
    const acabouDeSerDesligado =
      dto.statusColaborador === StatusColaborador.DESLIGADO &&
      user.statusColaborador !== StatusColaborador.DESLIGADO;

    const { dataNascimento, dataAdmissao, dataDesligamento, senha, ...resto } = dto;
    const habilitandoAcesso = dto.acessoPlataforma === true && user.acessoPlataforma === false;
    if (senha && !habilitandoAcesso && dto.acessoPlataforma !== false) {
      throw new BadRequestException('A senha só pode ser definida aqui ao habilitar o acesso à plataforma.');
    }
    const senhaGerada = habilitandoAcesso && !senha ? randomBytes(9).toString('base64url') : undefined;
    const senhaHash = dto.acessoPlataforma === false
      ? ''
      : habilitandoAcesso ? await bcrypt.hash(senha ?? senhaGerada!, 10) : undefined;

    // Sem data informada, a virada pra DESLIGADO grava a data atual; com data, permite desligamento retroativo.
    const dataDesligamentoResolvida = acabouDeSerDesligado
      ? dataDesligamento
        ? new Date(dataDesligamento)
        : new Date()
      : dataDesligamento
        ? new Date(dataDesligamento)
        : undefined;

    const atualizado = await this.prisma.$transaction(async (tx) => {
      return tx.user.update({
        where: { id },
        data: {
          ...resto,
          senhaHash,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
          dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : undefined,
          dataDesligamento: dataDesligamentoResolvida,
        },
        select: SELECT_PUBLICO,
      });
    });

    // Fora da transação de propósito: devolução e checklist têm suas próprias
    // escritas e não podem segurar a edição do cadastro se algo der errado nelas.
    if (acabouDeSerDesligado) {
      await this.alocacoesService.devolverTudoDoColaborador(id);
      await this.onboardingService.gerarPadrao(id, TipoChecklist.DESLIGAMENTO);
    }

    return { ...atualizado, senhaGerada };
  }

  async remove(id: string, chamador: UsuarioAutenticado) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === 'MASTER' && chamador.role !== 'MASTER') throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({ where: { id }, data: { ativo: false }, select: SELECT_PUBLICO });
  }

  async deletePermanently(id: string, chamador: UsuarioAutenticado) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === 'MASTER' && chamador.role !== 'MASTER') throw new NotFoundException('Usuário não encontrado');

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch {
      throw new ConflictException('Não é possível excluir este usuário porque ele possui histórico vinculado');
    }
    return { success: true };
  }
}
