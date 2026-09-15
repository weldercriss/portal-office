-- CreateEnum
CREATE TYPE "StatusColaborador" AS ENUM ('ATIVO', 'AFASTADO', 'FERIAS', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "StatusChecklistItem" AS ENUM ('PENDENTE', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "EtapaCandidato" AS ENUM ('TRIAGEM', 'ENTREVISTA', 'AVALIACAO', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "TipoDocumentoColaborador" AS ENUM ('CONTRATO', 'COMPROVANTE', 'POLITICA', 'HOLERITE', 'ASSINADO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoAvaliacao" AS ENUM ('AUTOAVALIACAO', 'GESTOR', 'PARES', 'AVALIACAO_360');

-- CreateEnum
CREATE TYPE "StatusMeta" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusTreinamento" AS ENUM ('PENDENTE', 'CONCLUIDO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bancoAgencia" TEXT,
ADD COLUMN     "bancoConta" TEXT,
ADD COLUMN     "bancoNome" TEXT,
ADD COLUMN     "bancoTipoConta" TEXT,
ADD COLUMN     "beneficios" TEXT,
ADD COLUMN     "cargo" TEXT,
ADD COLUMN     "gestorId" TEXT,
ADD COLUMN     "salario" DECIMAL(12,2),
ADD COLUMN     "statusColaborador" "StatusColaborador" NOT NULL DEFAULT 'ATIVO';

-- CreateTable
CREATE TABLE "Dependente" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "parentesco" TEXT NOT NULL,
    "dataNascimento" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dependente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoProfissional" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "departamento" TEXT,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3),
    "observacao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoProfissional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistAdmissaoItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" "StatusChecklistItem" NOT NULL DEFAULT 'PENDENTE',
    "concluidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistAdmissaoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaga" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "departamentoId" TEXT,
    "descricao" TEXT,
    "aberta" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "vagaId" TEXT NOT NULL,
    "etapa" "EtapaCandidato" NOT NULL DEFAULT 'TRIAGEM',
    "curriculoNome" TEXT,
    "curriculoCaminho" TEXT,
    "curriculoMimeType" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrevista" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "entrevistadorId" TEXT,
    "notas" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvaliacaoDesempenho" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avaliadorId" TEXT NOT NULL,
    "tipo" "TipoAvaliacao" NOT NULL,
    "periodo" TEXT NOT NULL,
    "nota" INTEGER,
    "comentarios" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvaliacaoDesempenho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusMeta" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "prazo" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdiItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "status" "StatusMeta" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "prazo" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdiItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoColaborador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoDocumentoColaborador" NOT NULL,
    "nome" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "arquivoCaminho" TEXT NOT NULL,
    "arquivoMimeType" TEXT NOT NULL,
    "validade" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoColaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treinamento" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treinamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreinamentoParticipante" (
    "id" TEXT NOT NULL,
    "treinamentoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "StatusTreinamento" NOT NULL DEFAULT 'PENDENTE',
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "TreinamentoParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroPonto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoMarcacao" NOT NULL,
    "registradoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroPonto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comunicado" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "criadoPorId" TEXT NOT NULL,
    "paraTodos" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comunicado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ComunicadoDepartamentos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ComunicadoDestinatarios" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "TreinamentoParticipante_treinamentoId_userId_key" ON "TreinamentoParticipante"("treinamentoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "_ComunicadoDepartamentos_AB_unique" ON "_ComunicadoDepartamentos"("A", "B");

-- CreateIndex
CREATE INDEX "_ComunicadoDepartamentos_B_index" ON "_ComunicadoDepartamentos"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ComunicadoDestinatarios_AB_unique" ON "_ComunicadoDestinatarios"("A", "B");

-- CreateIndex
CREATE INDEX "_ComunicadoDestinatarios_B_index" ON "_ComunicadoDestinatarios"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_gestorId_fkey" FOREIGN KEY ("gestorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependente" ADD CONSTRAINT "Dependente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoProfissional" ADD CONSTRAINT "HistoricoProfissional_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistAdmissaoItem" ADD CONSTRAINT "ChecklistAdmissaoItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaga" ADD CONSTRAINT "Vaga_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidato" ADD CONSTRAINT "Candidato_vagaId_fkey" FOREIGN KEY ("vagaId") REFERENCES "Vaga"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_entrevistadorId_fkey" FOREIGN KEY ("entrevistadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoDesempenho" ADD CONSTRAINT "AvaliacaoDesempenho_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvaliacaoDesempenho" ADD CONSTRAINT "AvaliacaoDesempenho_avaliadorId_fkey" FOREIGN KEY ("avaliadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdiItem" ADD CONSTRAINT "PdiItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoColaborador" ADD CONSTRAINT "DocumentoColaborador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoColaborador" ADD CONSTRAINT "DocumentoColaborador_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinamentoParticipante" ADD CONSTRAINT "TreinamentoParticipante_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "Treinamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreinamentoParticipante" ADD CONSTRAINT "TreinamentoParticipante_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroPonto" ADD CONSTRAINT "RegistroPonto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComunicadoDepartamentos" ADD CONSTRAINT "_ComunicadoDepartamentos_A_fkey" FOREIGN KEY ("A") REFERENCES "Comunicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComunicadoDepartamentos" ADD CONSTRAINT "_ComunicadoDepartamentos_B_fkey" FOREIGN KEY ("B") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComunicadoDestinatarios" ADD CONSTRAINT "_ComunicadoDestinatarios_A_fkey" FOREIGN KEY ("A") REFERENCES "Comunicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ComunicadoDestinatarios" ADD CONSTRAINT "_ComunicadoDestinatarios_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

