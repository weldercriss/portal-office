import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AniversariosService } from './aniversarios.service';
import { UpdateConfigAvisoAniversarioDto } from './dto/config-aviso-aniversario.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('configuracoes/avisos-aniversario')
export class ConfigAvisoAniversarioController {
  constructor(private readonly aniversariosService: AniversariosService) {}

  @Get()
  get() {
    return this.aniversariosService.getConfig();
  }

  @Patch()
  update(@Body() dto: UpdateConfigAvisoAniversarioDto) {
    return this.aniversariosService.updateConfig(dto);
  }
}
