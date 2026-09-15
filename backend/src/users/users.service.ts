import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { StatusColaborador } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AlocacoesService } from '../patrimonio/alocacoes.service';
import { PermissoesService } from '../permissoes/permissoes.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
  ) {}

  findAll() {
    return this.prisma.user.findMany({ select: SELECT_PUBLICO, orderBy: { nome: 'asc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: SELECT_PUBLICO });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    const rotinas = await this.permissoesService.resolveRotinas(id);
    return { ...user, rotinas };
  }

  async findMe(id: string) {
    const [usuario, credencial] = await Promise.all([
      this.findOne(id),
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

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Desligar devolve ao estoque tudo que estava com a pessoa. Só na virada:
    // salvar de novo alguém que já estava desligado não mexe no histórico.
    const acabouDeSerDesligado =
      dto.statusColaborador === StatusColaborador.DESLIGADO &&
      user.statusColaborador !== StatusColaborador.DESLIGADO;

    const { dataNascimento, dataAdmissao, senha, ...resto } = dto;
    const habilitandoAcesso = dto.acessoPlataforma === true && user.acessoPlataforma === false;
    if (senha && !habilitandoAcesso && dto.acessoPlataforma !== false) {
      throw new BadRequestException('A senha só pode ser definida aqui ao habilitar o acesso à plataforma.');
    }
    const senhaGerada = habilitandoAcesso && !senha ? randomBytes(9).toString('base64url') : undefined;
    const senhaHash = dto.acessoPlataforma === false
      ? ''
      : habilitandoAcesso ? await bcrypt.hash(senha ?? senhaGerada!, 10) : undefined;

    const atualizado = await this.prisma.$transaction(async (tx) => {
      return tx.user.update({
        where: { id },
        data: {
          ...resto,
          senhaHash,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
          dataAdmissao: dataAdmissao ? new Date(dataAdmissao) : undefined,
        },
        select: SELECT_PUBLICO,
      });
    });

    // Fora da transação de propósito: a devolução tem transação própria e não
    // pode segurar a edição do cadastro se algo der errado nela.
    if (acabouDeSerDesligado) {
      await this.alocacoesService.devolverTudoDoColaborador(id);
    }

    return { ...atualizado, senhaGerada };
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({ where: { id }, data: { ativo: false }, select: SELECT_PUBLICO });
  }

  async deletePermanently(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    try {
      await this.prisma.user.delete({ where: { id } });
    } catch {
      throw new ConflictException('Não é possível excluir este usuário porque ele possui histórico vinculado');
    }
    return { success: true };
  }
}
