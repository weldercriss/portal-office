import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { LogsAplicacaoController } from './logs-aplicacao.controller';
import { LogsAplicacaoExceptionFilter } from './logs-aplicacao-exception.filter';
import { LogsAplicacaoMiddleware } from './logs-aplicacao.middleware';
import { LogsAplicacaoService } from './logs-aplicacao.service';

@Module({
  controllers: [LogsAplicacaoController],
  providers: [
    LogsAplicacaoService,
    LogsAplicacaoMiddleware,
    { provide: APP_FILTER, useClass: LogsAplicacaoExceptionFilter },
  ],
})
export class LogsAplicacaoModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LogsAplicacaoMiddleware).forRoutes('*');
  }
}
