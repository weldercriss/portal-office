import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ANEXO_MULTER_OPTIONS } from './anexo.storage';
import { CriarSolicitacaoPublicaDto } from './dto/criar-solicitacao-publica.dto';
import { SolicitacoesService } from './solicitacoes.service';

/**
 * Formulário público de um TIPO de solicitação — como um Google Forms: link fixo e
 * reutilizável, qualquer pessoa responde sem login e sem precisar ser colaborador
 * cadastrado. Deliberadamente sem @UseGuards e em controller próprio, separado do
 * autenticado, pra nunca correr o risco de misturar rota pública com rota protegida.
 */
@Controller('formulario-publico')
export class FormularioPublicoController {
  constructor(private readonly solicitacoesService: SolicitacoesService) {}

  @Get(':token')
  obter(@Param('token') token: string) {
    return this.solicitacoesService.obterFormularioPublico(token);
  }

  @Post(':token')
  criar(@Param('token') token: string, @Body() dto: CriarSolicitacaoPublicaDto) {
    return this.solicitacoesService.criarSolicitacaoPublica(token, dto.respostasFormulario);
  }

  @Post(':token/:solicitacaoId/anexo/:campoId')
  @UseInterceptors(FileInterceptor('anexo', ANEXO_MULTER_OPTIONS))
  anexar(
    @Param('token') token: string,
    @Param('solicitacaoId') solicitacaoId: string,
    @Param('campoId') campoId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Envie um arquivo');
    return this.solicitacoesService.anexarCampoFormularioPublico(token, solicitacaoId, campoId, file);
  }
}
