import { Global, Module } from '@nestjs/common';
import { PermissoesController } from './permissoes.controller';
import { PermissoesService } from './permissoes.service';

@Global()
@Module({
  providers: [PermissoesService],
  controllers: [PermissoesController],
  exports: [PermissoesService],
})
export class PermissoesModule {}
