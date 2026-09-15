-- AlterTable
ALTER TABLE "Comunicado" ADD COLUMN     "imagemCaminho" TEXT,
ADD COLUMN     "imagemMimeType" TEXT,
ADD COLUMN     "imagemNome" TEXT,
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "ComunicadoTemplate" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "imagemNome" TEXT,
    "imagemCaminho" TEXT,
    "imagemMimeType" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComunicadoTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComunicadoStatus" (
    "id" TEXT NOT NULL,
    "comunicadoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "arquivada" BOOLEAN NOT NULL DEFAULT false,
    "excluida" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComunicadoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ComunicadoStatus_comunicadoId_userId_key" ON "ComunicadoStatus"("comunicadoId", "userId");

-- AddForeignKey
ALTER TABLE "Comunicado" ADD CONSTRAINT "Comunicado_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ComunicadoTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComunicadoStatus" ADD CONSTRAINT "ComunicadoStatus_comunicadoId_fkey" FOREIGN KEY ("comunicadoId") REFERENCES "Comunicado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComunicadoStatus" ADD CONSTRAINT "ComunicadoStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: nova rotina "comunicados" (controla quem pode ver/gerenciar/limpar comunicados enviados)
INSERT INTO "Rotina" ("id", "chave", "nome", "ativo") VALUES
  (gen_random_uuid(), 'comunicados', 'Comunicados', true)
ON CONFLICT ("chave") DO NOTHING;

-- Seed: liga a rotina "comunicados" a todos os departamentos existentes, para não travar acesso
INSERT INTO "GroupRotina" ("id", "groupId", "rotinaId")
SELECT gen_random_uuid(), g."id", r."id"
FROM "Group" g
CROSS JOIN "Rotina" r
WHERE r."chave" = 'comunicados'
ON CONFLICT ("groupId", "rotinaId") DO NOTHING;
