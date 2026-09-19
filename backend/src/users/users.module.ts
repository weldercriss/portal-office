import { Module } from '@nestjs/common';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { PatrimonioModule } from '../patrimonio/patrimonio.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PatrimonioModule, OnboardingModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
