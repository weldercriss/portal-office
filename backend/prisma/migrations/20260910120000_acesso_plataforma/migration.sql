-- Preserva os acessos existentes; novos cadastros precisam de acesso explícito.
ALTER TABLE "User" ADD COLUMN "acessoPlataforma" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ALTER COLUMN "acessoPlataforma" SET DEFAULT false;
