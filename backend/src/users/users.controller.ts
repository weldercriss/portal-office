import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateMasterUserDto } from './dto/create-master-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

interface UsuarioAutenticado {
  id: string;
  role: string;
}

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  findMe(@Req() req: Request) {
    const usuario = req.user as UsuarioAutenticado;
    return this.usersService.findMe(usuario.id, usuario);
  }

  @Patch('me/password')
  changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const usuario = req.user as UsuarioAutenticado;
    return this.usersService.changePassword(usuario.id, dto);
  }

  /**
   * Usuários master: administração da própria plataforma, não colaboradores.
   * Só um master consulta/cria outro master — precisa vir antes de `:id` para
   * "masters" não ser lido como um id.
   */
  @Get('masters')
  @UseGuards(RolesGuard)
  @Roles('MASTER')
  findMasters() {
    return this.usersService.findMasters();
  }

  @Post('masters')
  @UseGuards(RolesGuard)
  @Roles('MASTER')
  createMaster(@Body() dto: CreateMasterUserDto) {
    return this.usersService.createMaster(dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findAll(@Req() req: Request) {
    return this.usersService.findAll(req.user as UsuarioAutenticado);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.findOne(id, req.user as UsuarioAutenticado);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    return this.usersService.update(id, dto, req.user as UsuarioAutenticado);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.remove(id, req.user as UsuarioAutenticado);
  }

  @Delete(':id/permanent')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  deletePermanently(@Param('id') id: string, @Req() req: Request) {
    return this.usersService.deletePermanently(id, req.user as UsuarioAutenticado);
  }
}
