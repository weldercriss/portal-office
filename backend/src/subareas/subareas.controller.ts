import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateSubAreaDto } from './dto/create-subarea.dto';
import { UpdateSubAreaDto } from './dto/update-subarea.dto';
import { SubAreasService } from './subareas.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('subareas')
export class SubAreasController {
  constructor(private readonly subAreasService: SubAreasService) {}

  @Get()
  findAll(@Query('groupId') groupId?: string, @Query('all') all?: string) {
    return this.subAreasService.findAll(groupId, all === 'true');
  }

  @Post()
  create(@Body() dto: CreateSubAreaDto) {
    return this.subAreasService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubAreaDto) {
    return this.subAreasService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subAreasService.remove(id);
  }

  @Delete(':id/permanent')
  deletePermanently(@Param('id') id: string) {
    return this.subAreasService.deletePermanently(id);
  }
}
