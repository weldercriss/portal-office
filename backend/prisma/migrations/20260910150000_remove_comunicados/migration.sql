BEGIN;

DROP TABLE "ComunicadoStatus";
DROP TABLE "_ComunicadoDepartamentos";
DROP TABLE "_ComunicadoDestinatarios";
DROP TABLE "Comunicado";
DROP TABLE "ComunicadoTemplate";

DELETE FROM "Notificacao" WHERE "tipo" = 'COMUNICADO';
DELETE FROM "TelegramNotificacaoTipo" WHERE "tipo" = 'COMUNICADO';
-- As permissões por departamento e usuário são removidas por ON DELETE CASCADE.
DELETE FROM "Rotina" WHERE "chave" = 'comunicados';

COMMIT;
