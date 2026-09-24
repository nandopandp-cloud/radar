-- Anexos passam a morar no Cloudflare R2.
--
-- Primeira metade da troca: a coluna "chave" nasce opcional e "conteudo" deixa
-- de ser obrigatória, para o código antigo seguir funcionando enquanto
-- scripts/anexos-para-r2.ts copia os arquivos existentes para o bucket. A
-- migration seguinte remove "conteudo" e torna "chave" obrigatória.

ALTER TABLE "Anexo" ADD COLUMN "chave" TEXT;
ALTER TABLE "Anexo" ALTER COLUMN "conteudo" DROP NOT NULL;
CREATE INDEX "Anexo_chave_idx" ON "Anexo"("chave");

ALTER TABLE "AnexoRecorrencia" ADD COLUMN "chave" TEXT;
ALTER TABLE "AnexoRecorrencia" ALTER COLUMN "conteudo" DROP NOT NULL;
CREATE INDEX "AnexoRecorrencia_chave_idx" ON "AnexoRecorrencia"("chave");
