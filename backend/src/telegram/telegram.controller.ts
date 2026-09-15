import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdicionarTelegramGrupoDto } from './dto/adicionar-telegram-grupo.dto';
import { UpdateTelegramConfigDto } from './dto/update-telegram-config.dto';
import { UpdateTelegramTipoDto } from './dto/update-telegram-tipo.dto';
import { TelegramService } from './telegram.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getConfig() {
    return this.telegramService.getConfig();
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setConfig(@Body() dto: UpdateTelegramConfigDto) {
    return this.telegramService.setConfig(dto);
  }

  @Get('tipos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listTipos() {
    return this.telegramService.listTipos();
  }

  /** Grupos/tópicos que o bot já viu (mandando /id ou qualquer mensagem lá), pra escolher sem digitar números. */
  @Get('grupos-detectados')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listarGruposDetectados() {
    return this.telegramService.listarGruposDetectados();
  }

  @Get('grupos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listarGrupos() {
    return this.telegramService.listarGrupos();
  }

  @Post('grupos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adicionarGrupo(@Body() dto: AdicionarTelegramGrupoDto) {
    return this.telegramService.adicionarGrupo(dto);
  }

  @Delete('grupos/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  removerGrupo(@Param('id') id: string) {
    return this.telegramService.removerGrupo(id);
  }

  /** Link pessoal pra qualquer usuário logado conectar o próprio Telegram, sem digitar nada. */
  @Get('connect-link')
  @UseGuards(JwtAuthGuard)
  getLinkDeConexao(@Req() req: Request) {
    return this.telegramService.getLinkDeConexao((req.user as UsuarioAutenticado).id);
  }

  @Put('tipos/:tipo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  setTipo(@Param('tipo') tipo: string, @Body() dto: UpdateTelegramTipoDto) {
    return this.telegramService.setTipoEnviar(tipo, dto);
  }

  /** Manda uma mensagem de teste pro próprio admin logado, pra confirmar que a integração funciona. */
  @Post('test')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  enviarTeste(@Req() req: Request) {
    return this.telegramService.enviarTeste((req.user as UsuarioAutenticado).id);
  }

  /** Endpoint público (sem JWT) chamado pelo Telegram — protegido só pelo segredo na própria URL. */
  @Post('webhook/:secret')
  @HttpCode(200)
  async webhook(@Param('secret') secret: string, @Body() update: unknown) {
    if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      throw new ForbiddenException();
    }
    await this.telegramService.processarWebhook(update as Parameters<TelegramService['processarWebhook']>[0]);
    return { ok: true };
  }
}
