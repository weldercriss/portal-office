import { Module } from '@nestjs/common';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UsersModule } from '../users/users.module';
import { RecrutamentoController } from './recrutamento.controller';
import { RecrutamentoService } from './recrutamento.service';

@Module({
  imports: [UsersModule, OnboardingModule],
  providers: [RecrutamentoService],
  controllers: [RecrutamentoController],
})
export class RecrutamentoModule {}
