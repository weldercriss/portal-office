import { Injectable, NotFoundException } from '@nestjs/common';
import { OnboardingService } from '../onboarding/onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import {
  ConverterCandidatoDto,
  CreateCandidatoDto,
  CreateEntrevistaDto,
  CreateVagaDto,
  UpdateCandidatoDto,
  UpdateVagaDto,
} from './dto/recrutamento.dto';

const INCLUDE_VAGA = {
  departamento: { select: { id: true, nome: true } },
  _count: { select: { candidatos: true } },
} as const;

@Injectable()
export class RecrutamentoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly onboardingService: OnboardingService,
  ) {}

  findVagas(aberta?: boolean) {
    return this.prisma.vaga.findMany({
      where: aberta === undefined ? undefined : { aberta },
      orderBy: { criadoEm: 'desc' },
      include: INCLUDE_VAGA,
    });
  }

  createVaga(dto: CreateVagaDto) {
    return this.prisma.vaga.create({ data: dto, include: INCLUDE_VAGA });
  }

  async updateVaga(id: string, dto: UpdateVagaDto) {
    const existente = await this.prisma.vaga.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Vaga não encontrada');
    return this.prisma.vaga.update({ where: { id }, data: dto, include: INCLUDE_VAGA });
  }

  async removeVaga(id: string) {
    const existente = await this.prisma.vaga.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Vaga não encontrada');
    await this.prisma.vaga.delete({ where: { id } });
    return { success: true };
  }

  findCandidatos(vagaId?: string) {
    return this.prisma.candidato.findMany({
      where: vagaId ? { vagaId } : undefined,
      orderBy: { criadoEm: 'desc' },
      include: { vaga: { select: { id: true, titulo: true } } },
    });
  }

  async findCandidato(id: string) {
    const candidato = await this.prisma.candidato.findUnique({
      where: { id },
      include: {
        vaga: { select: { id: true, titulo: true } },
        entrevistas: { include: { entrevistador: { select: { id: true, nome: true } } }, orderBy: { data: 'asc' } },
      },
    });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');
    return candidato;
  }

  async createCandidato(vagaId: string, dto: CreateCandidatoDto) {
    const vaga = await this.prisma.vaga.findUnique({ where: { id: vagaId } });
    if (!vaga) throw new NotFoundException('Vaga não encontrada');
    return this.prisma.candidato.create({
      data: { vagaId, nome: dto.nome, email: dto.email, telefone: dto.telefone, observacoes: dto.observacoes },
    });
  }

  async updateCandidato(id: string, dto: UpdateCandidatoDto) {
    const existente = await this.prisma.candidato.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Candidato não encontrado');
    return this.prisma.candidato.update({ where: { id }, data: dto });
  }

  async removeCandidato(id: string) {
    const existente = await this.prisma.candidato.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Candidato não encontrado');
    await this.prisma.candidato.delete({ where: { id } });
    return { success: true };
  }

  async anexarCurriculo(id: string, file: Express.Multer.File) {
    const existente = await this.prisma.candidato.findUnique({ where: { id } });
    if (!existente) throw new NotFoundException('Candidato não encontrado');
    return this.prisma.candidato.update({
      where: { id },
      data: { curriculoNome: file.originalname, curriculoCaminho: file.filename, curriculoMimeType: file.mimetype },
    });
  }

  async obterCurriculo(id: string) {
    const candidato = await this.prisma.candidato.findUnique({ where: { id } });
    if (!candidato || !candidato.curriculoCaminho) throw new NotFoundException('Currículo não encontrado');
    return { nome: candidato.curriculoNome!, mimeType: candidato.curriculoMimeType!, caminho: candidato.curriculoCaminho };
  }

  async createEntrevista(candidatoId: string, dto: CreateEntrevistaDto) {
    const candidato = await this.prisma.candidato.findUnique({ where: { id: candidatoId } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');
    if (candidato.etapa === 'TRIAGEM') {
      await this.prisma.candidato.update({ where: { id: candidatoId }, data: { etapa: 'ENTREVISTA' } });
    }
    return this.prisma.entrevista.create({
      data: {
        candidatoId,
        data: new Date(dto.data),
        entrevistadorId: dto.entrevistadorId,
        notas: dto.notas,
      },
      include: { entrevistador: { select: { id: true, nome: true } } },
    });
  }

  /**
   * "Candidato aprovado → sistema cria automaticamente checklist de admissão → ... → cria cadastro de colaborador
   * → inicia onboarding" — a automação descrita no pedido original. Cria o User a partir do candidato aprovado
   * e já gera o checklist de admissão padrão pra ele.
   */
  async converterEmColaborador(candidatoId: string, dto: ConverterCandidatoDto) {
    const candidato = await this.prisma.candidato.findUnique({ where: { id: candidatoId } });
    if (!candidato) throw new NotFoundException('Candidato não encontrado');

    const colaborador = await this.usersService.create({
      nome: candidato.nome,
      email: candidato.email,
      role: UserRole.USER,
      groupId: dto.groupId,
      telefone: candidato.telefone ?? undefined,
      telegramUsername: dto.telegramUsername,
      dataAdmissao: new Date().toISOString().slice(0, 10),
    });

    await this.onboardingService.gerarPadrao(colaborador.id);
    await this.prisma.candidato.update({ where: { id: candidatoId }, data: { etapa: 'APROVADO' } });

    return colaborador;
  }
}
