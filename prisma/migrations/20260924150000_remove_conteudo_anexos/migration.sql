-- Segunda metade da troca para o R2: com todos os arquivos copiados para o
-- bucket por scripts/anexos-para-r2.ts, o base64 sai do banco e a chave passa
-- a ser obrigatória.

ALTER TABLE "Anexo" DROP COLUMN "conteudo";
ALTER TABLE "Anexo" ALTER COLUMN "chave" SET NOT NULL;

ALTER TABLE "AnexoRecorrencia" DROP COLUMN "conteudo";
ALTER TABLE "AnexoRecorrencia" ALTER COLUMN "chave" SET NOT NULL;
