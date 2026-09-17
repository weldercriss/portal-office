-- AlterEnum
-- Precisa ficar sozinha nesta migration: o Postgres nao permite usar um valor
-- novo de enum na mesma transacao em que ele foi adicionado.
ALTER TYPE "Role" ADD VALUE 'MASTER';
