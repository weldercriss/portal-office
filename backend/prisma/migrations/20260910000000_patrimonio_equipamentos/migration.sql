-- CreateEnum
CREATE TYPE "EstadoEquipamento" AS ENUM ('NOVO', 'BOM', 'REGULAR', 'RUIM', 'DANIFICADO');

-- CreateEnum
CREATE TYPE "EquipamentoStatus" AS ENUM ('EM_COMPRA', 'AGUARDANDO_CHEGADA', 'ESTOQUE', 'EM_USO', 'MANUTENCAO', 'BAIXADO');

-- CreateEnum
CREATE TYPE "AlocacaoStatus" AS ENUM ('PENDENTE', 'ENTREGUE', 'ASSINADO', 'DEVOLVIDO', 'CANCELADA');

-- CreateTable
CREATE TABLE "TipoEquipamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "exigeTermo" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TipoEquipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipamento" (
    "id" TEXT NOT NULL,
    "tipoId" TEXT NOT NULL,
    "numero" TEXT,
    "numeroSerie" TEXT,
    "marca" TEXT,
    "modelo" TEXT,
    "estado" "EstadoEquipamento" NOT NULL DEFAULT 'NOVO',
    "status" "EquipamentoStatus" NOT NULL DEFAULT 'ESTOQUE',
    "dataAquisicao" TIMESTAMP(3),
    "valorAquisicao" DECIMAL(12,2),
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlocacaoEquipamento" (
    "id" TEXT NOT NULL,
    "equipamentoId" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataDevolucao" TIMESTAMP(3),
    "status" "AlocacaoStatus" NOT NULL DEFAULT 'PENDENTE',
    "estadoNaEntrega" "EstadoEquipamento",
    "estadoNaDevolucao" "EstadoEquipamento",
    "observacoes" TEXT,
    "motivoDevolucao" TEXT,
    "termoNome" TEXT,
    "termoCaminho" TEXT,
    "termoMimeType" TEXT,
    "termoEnviadoEm" TIMESTAMP(3),
    "registradoPorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlocacaoEquipamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TipoEquipamento_nome_key" ON "TipoEquipamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_numero_key" ON "Equipamento"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Equipamento_numeroSerie_key" ON "Equipamento"("numeroSerie");

-- CreateIndex
CREATE INDEX "Equipamento_tipoId_idx" ON "Equipamento"("tipoId");

-- CreateIndex
CREATE INDEX "Equipamento_status_idx" ON "Equipamento"("status");

-- CreateIndex
CREATE INDEX "AlocacaoEquipamento_equipamentoId_idx" ON "AlocacaoEquipamento"("equipamentoId");

-- CreateIndex
CREATE INDEX "AlocacaoEquipamento_colaboradorId_idx" ON "AlocacaoEquipamento"("colaboradorId");

-- CreateIndex
CREATE INDEX "AlocacaoEquipamento_status_idx" ON "AlocacaoEquipamento"("status");

-- AddForeignKey
ALTER TABLE "Equipamento" ADD CONSTRAINT "Equipamento_tipoId_fkey" FOREIGN KEY ("tipoId") REFERENCES "TipoEquipamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoEquipamento" ADD CONSTRAINT "AlocacaoEquipamento_equipamentoId_fkey" FOREIGN KEY ("equipamentoId") REFERENCES "Equipamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoEquipamento" ADD CONSTRAINT "AlocacaoEquipamento_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlocacaoEquipamento" ADD CONSTRAINT "AlocacaoEquipamento_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: nova rotina "patrimonio" (bens e equipamentos)
INSERT INTO "Rotina" ("id", "chave", "nome", "ativo") VALUES
  (gen_random_uuid(), 'patrimonio', 'Bens e equipamentos', true)
ON CONFLICT ("chave") DO NOTHING;

-- Seed: liga a rotina "patrimonio" aos departamentos existentes, para nao travar
-- o acesso de quem ja estava cadastrado (admin ajusta depois).
INSERT INTO "GroupRotina" ("id", "groupId", "rotinaId")
SELECT gen_random_uuid(), g."id", r."id"
FROM "Group" g
CROSS JOIN "Rotina" r
WHERE r."chave" = 'patrimonio'
ON CONFLICT ("groupId", "rotinaId") DO NOTHING;

-- Seed: catalogo inicial com os tipos citados no plano.
INSERT INTO "TipoEquipamento" ("id", "nome", "descricao", "exigeTermo", "ativo", "atualizadoEm") VALUES
  (gen_random_uuid(), 'Notebook', 'Notebooks fornecidos aos colaboradores', true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Headset', 'Headsets de atendimento', true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Fone', 'Fones de ouvido', false, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Mouse', 'Mouses', false, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Teclado', 'Teclados', false, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Monitor', 'Monitores', true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("nome") DO NOTHING;

-- Seed: tipos de notificação do patrimônio (começam desligados no Telegram)
INSERT INTO "TelegramNotificacaoTipo" ("id", "tipo", "nome", "enviar") VALUES
  (gen_random_uuid(), 'EQUIPAMENTO_ENTREGUE', 'Equipamento entregue a você', false),
  (gen_random_uuid(), 'EQUIPAMENTO_TERMO_PENDENTE', 'Termo de equipamento aguardando assinatura', false),
  (gen_random_uuid(), 'EQUIPAMENTO_DEVOLVIDO', 'Equipamento devolvido', false)
ON CONFLICT ("tipo") DO NOTHING;
