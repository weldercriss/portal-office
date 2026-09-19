-- AlterTable: foto de perfil configurável (upload manual, além da vinda do Google)
ALTER TABLE "User" ADD COLUMN     "avatarCaminho" TEXT,
ADD COLUMN     "avatarMimeType" TEXT;

-- CreateTable
CREATE TABLE "CategoriaDocumento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaDocumento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoriaDocumento_nome_key" ON "CategoriaDocumento"("nome");

-- Seed: categorias iniciais, herdadas do enum TipoDocumentoColaborador que esta
-- migration substitui, mais os exemplos já citados pelo usuário para a Central
-- de Documentos (Contrato Aditivo, Plano de saúde). Admin gerencia o catálogo
-- daqui em diante.
INSERT INTO "CategoriaDocumento" ("id", "nome", "ativo") VALUES
  (gen_random_uuid(), 'Contrato', true),
  (gen_random_uuid(), 'Comprovante', true),
  (gen_random_uuid(), 'Política interna', true),
  (gen_random_uuid(), 'Holerite', true),
  (gen_random_uuid(), 'Documento assinado', true),
  (gen_random_uuid(), 'Outro', true),
  (gen_random_uuid(), 'Contrato Aditivo', true),
  (gen_random_uuid(), 'Plano de saúde', true)
ON CONFLICT ("nome") DO NOTHING;

-- AlterTable: categoriaId nasce opcional para permitir o backfill abaixo antes
-- de virar obrigatório; competencia é a nova coluna de mês/ano do contracheque.
ALTER TABLE "DocumentoColaborador" ADD COLUMN     "categoriaId" TEXT,
ADD COLUMN     "competencia" TIMESTAMP(3);

-- Backfill: religa cada documento existente à categoria equivalente ao "tipo" antigo.
UPDATE "DocumentoColaborador" d SET "categoriaId" = c."id"
FROM "CategoriaDocumento" c
WHERE d."tipo" = 'CONTRATO' AND c."nome" = 'Contrato';

UPDATE "DocumentoColaborador" d SET "categoriaId" = c."id"
FROM "CategoriaDocumento" c
WHERE d."tipo" = 'COMPROVANTE' AND c."nome" = 'Comprovante';

UPDATE "DocumentoColaborador" d SET "categoriaId" = c."id"
FROM "CategoriaDocumento" c
WHERE d."tipo" = 'POLITICA' AND c."nome" = 'Política interna';

UPDATE "DocumentoColaborador" d SET "categoriaId" = c."id"
FROM "CategoriaDocumento" c
WHERE d."tipo" = 'HOLERITE' AND c."nome" = 'Holerite';

UPDATE "DocumentoColaborador" d SET "categoriaId" = c."id"
FROM "CategoriaDocumento" c
WHERE d."tipo" = 'ASSINADO' AND c."nome" = 'Documento assinado';

UPDATE "DocumentoColaborador" d SET "categoriaId" = c."id"
FROM "CategoriaDocumento" c
WHERE d."tipo" = 'OUTRO' AND c."nome" = 'Outro';

-- AlterTable: agora que todo registro existente tem categoria, torna a coluna
-- obrigatória e remove o enum antigo que ela substitui.
ALTER TABLE "DocumentoColaborador" ALTER COLUMN "categoriaId" SET NOT NULL;
ALTER TABLE "DocumentoColaborador" DROP COLUMN "tipo";
DROP TYPE "TipoDocumentoColaborador";

-- AddForeignKey
ALTER TABLE "DocumentoColaborador" ADD CONSTRAINT "DocumentoColaborador_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "CategoriaDocumento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
