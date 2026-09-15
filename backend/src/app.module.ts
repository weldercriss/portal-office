import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AgendaGoogleModule } from './agenda-google/agenda-google.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { AniversariosModule } from './aniversarios/aniversarios.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DependentesModule } from './dependentes/dependentes.module';
import { DocumentosModule } from './documentos/documentos.module';
import { GroupsModule } from './groups/groups.module';
import { HistoricoModule } from './historico-profissional/historico.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PatrimonioModule } from './patrimonio/patrimonio.module';
import { PermissoesModule } from './permissoes/permissoes.module';
import { PlantoesModule } from './plantoes/plantoes.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecrutamentoModule } from './recrutamento/recrutamento.module';
import { SolicitacoesModule } from './solicitacoes/solicitacoes.module';
import { SubAreasModule } from './subareas/subareas.module';
import { TelegramModule } from './telegram/telegram.module';
import { TemplatesFormularioModule } from './templates-formulario/templates-formulario.module';
import { TiposPlantaoModule } from './tipos-plantao/tipos-plantao.module';
import { TiposSolicitacaoModule } from './tipos-solicitacao/tipos-solicitacao.module';
import { TreinamentosModule } from './treinamentos/treinamentos.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    PermissoesModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    SubAreasModule,
    TelegramModule,
    NotificacoesModule,
    AgendaGoogleModule,
    PlantoesModule,
    AgendamentoModule,
    PatrimonioModule,
    TiposPlantaoModule,
    TiposSolicitacaoModule,
    TemplatesFormularioModule,
    SolicitacoesModule,
    AniversariosModule,
    DashboardModule,
    DependentesModule,
    HistoricoModule,
    OnboardingModule,
    DocumentosModule,
    TreinamentosModule,
    RecrutamentoModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
