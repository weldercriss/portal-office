import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { AlocacoesService } from './alocacoes.service';
import { EquipamentosService } from './equipamentos.service';
import { AlocacoesController, EquipamentosController, TiposEquipamentoController } from './patrimonio.controller';
import { TiposEquipamentoService } from './tipos-equipamento.service';

/**
 * Bens e equipamentos fornecidos aos colaboradores. Exporta AlocacoesService
 * porque o cadastro de usuários precisa dele: desligar alguém devolve ao
 * estoque tudo que estava com a pessoa.
 */
@Module({
  imports: [NotificacoesModule],
  providers: [TiposEquipamentoService, EquipamentosService, AlocacoesService],
  controllers: [TiposEquipamentoController, EquipamentosController, AlocacoesController],
  exports: [AlocacoesService, EquipamentosService],
})
export class PatrimonioModule {}
