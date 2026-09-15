import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { createUploadMulterOptions, uploadDir } from '../common/upload.storage';
import { join } from 'path';
import {
  ConverterCandidatoDto,
  CreateCandidatoDto,
  CreateEntrevistaDto,
  CreateVagaDto,
  UpdateCandidatoDto,
  UpdateVagaDto,
} from './dto/recrutamento.dto';
import { RecrutamentoService } from './recrutamento.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller()
export class RecrutamentoController {
  constructor(private readonly recrutamentoService: RecrutamentoService) {}

  @Get('vagas')
  findVagas(@Query('aberta') aberta?: string) {
    return this.recrutamentoService.findVagas(aberta === undefined ? undefined : aberta === 'true');
  }

  @Post('vagas')
  createVaga(@Body() dto: CreateVagaDto) {
    return this.recrutamentoService.createVaga(dto);
  }

  @Patch('vagas/:id')
  updateVaga(@Param('id') id: string, @Body() dto: UpdateVagaDto) {
    return this.recrutamentoService.updateVaga(id, dto);
  }

  @Delete('vagas/:id')
  removeVaga(@Param('id') id: string) {
    return this.recrutamentoService.removeVaga(id);
  }

  @Get('vagas/:vagaId/candidatos')
  findCandidatosDaVaga(@Param('vagaId') vagaId: string) {
    return this.recrutamentoService.findCandidatos(vagaId);
  }

  @Post('vagas/:vagaId/candidatos')
  createCandidato(@Param('vagaId') vagaId: string, @Body() dto: CreateCandidatoDto) {
    return this.recrutamentoService.createCandidato(vagaId, dto);
  }

  @Get('candidatos')
  findCandidatos() {
    return this.recrutamentoService.findCandidatos();
  }

  @Get('candidatos/:id')
  findCandidato(@Param('id') id: string) {
    return this.recrutamentoService.findCandidato(id);
  }

  @Patch('candidatos/:id')
  updateCandidato(@Param('id') id: string, @Body() dto: UpdateCandidatoDto) {
    return this.recrutamentoService.updateCandidato(id, dto);
  }

  @Delete('candidatos/:id')
  removeCandidato(@Param('id') id: string) {
    return this.recrutamentoService.removeCandidato(id);
  }

  @Post('candidatos/:id/curriculo')
  @UseInterceptors(FileInterceptor('curriculo', createUploadMulterOptions('curriculos')))
  anexarCurriculo(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie um arquivo');
    return this.recrutamentoService.anexarCurriculo(id, file);
  }

  @Get('candidatos/:id/curriculo')
  async baixarCurriculo(@Param('id') id: string, @Res() res: Response) {
    const arquivo = await this.recrutamentoService.obterCurriculo(id);
    res.setHeader('Content-Type', arquivo.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(arquivo.nome)}"`);
    res.sendFile(join(uploadDir('curriculos'), arquivo.caminho));
  }

  @Post('candidatos/:id/entrevistas')
  createEntrevista(@Param('id') id: string, @Body() dto: CreateEntrevistaDto) {
    return this.recrutamentoService.createEntrevista(id, dto);
  }

  @Post('candidatos/:id/converter-em-colaborador')
  converter(@Param('id') id: string, @Body() dto: ConverterCandidatoDto) {
    return this.recrutamentoService.converterEmColaborador(id, dto);
  }
}
