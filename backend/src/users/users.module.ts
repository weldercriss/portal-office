import { Module } from '@nestjs/common';
import { PatrimonioModule } from '../patrimonio/patrimonio.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PatrimonioModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
