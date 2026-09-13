-- Anexos do molde da recorrência.
--
-- Ficam guardados na regra e são copiados para cada demanda que ela gera.
-- Tabela separada de "Anexo" porque aquela exige uma demanda, que ainda não
-- existe quando o arquivo é escolhido no formulário da recorrência.

CREATE TABLE "AnexoRecorrencia" (
    "id" TEXT NOT NULL,
    "recorrenciaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnexoRecorrencia_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnexoRecorrencia_recorrenciaId_idx" ON "AnexoRecorrencia"("recorrenciaId");

-- Apagar a regra leva junto os anexos do molde; as demandas já geradas
-- mantêm as próprias cópias.
ALTER TABLE "AnexoRecorrencia" ADD CONSTRAINT "AnexoRecorrencia_recorrenciaId_fkey" FOREIGN KEY ("recorrenciaId") REFERENCES "Recorrencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
