import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SetGroupRotinasDto } from './dto/set-group-rotinas.dto';
import { SetUserOverrideDto } from './dto/set-user-override.dto';
import { PermissoesService } from './permissoes.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('permissoes')
export class PermissoesController {
  constructor(private readonly permissoesService: PermissoesService) {}

  @Get('rotinas')
  listRotinas() {
    return this.permissoesService.listRotinas();
  }

  @Get('grupos/:groupId')
  getGroupRotinas(@Param('groupId') groupId: string) {
    return this.permissoesService.getGroupRotinas(groupId);
  }

  @Put('grupos/:groupId')
  setGroupRotinas(@Param('groupId') groupId: string, @Body() dto: SetGroupRotinasDto) {
    return this.permissoesService.setGroupRotinas(groupId, dto.rotinas);
  }

  @Get('usuarios/:userId')
  getUserOverrides(@Param('userId') userId: string) {
    return this.permissoesService.getUserOverrides(userId);
  }

  @Put('usuarios/:userId/:chave')
  setUserOverride(
    @Param('userId') userId: string,
    @Param('chave') chave: string,
    @Body() dto: SetUserOverrideDto,
  ) {
    return this.permissoesService.setUserOverride(userId, chave, dto.concedida);
  }
}
