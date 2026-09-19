-- CreateTable
CREATE TABLE "ConfigAvisoAniversario" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "diasAntecedencia" INTEGER[] DEFAULT ARRAY[15, 10, 5, 3, 1]::INTEGER[],
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigAvisoAniversario_pkey" PRIMARY KEY ("id")
);
