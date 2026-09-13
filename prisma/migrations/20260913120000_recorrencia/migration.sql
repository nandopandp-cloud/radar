-- Demandas recorrentes.
--
-- A regra guarda o molde e a cadência; as demandas são materializadas pelo
-- cron diário, uma por vez, conforme a data chega. "ultimaGeracao" é o que
-- impede repetir ou pular uma ocorrência entre execuções.
--
-- Apagar a regra não apaga o histórico: as demandas já criadas ficam, com
-- "recorrenciaId" nulo.

CREATE TABLE "Recorrencia" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "categoria" TEXT,
    "solicitante" TEXT,
    "frequencia" TEXT NOT NULL,
    "intervalo" INTEGER NOT NULL DEFAULT 1,
    "diasSemana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "diaDoMes" INTEGER,
    "apenasDiasUteis" BOOLEAN NOT NULL DEFAULT false,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "maximo" INTEGER,
    "ultimaGeracao" TIMESTAMP(3),
    "geradas" INTEGER NOT NULL DEFAULT 0,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "autorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recorrencia_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Demanda" ADD COLUMN "recorrenciaId" TEXT;

CREATE INDEX "Recorrencia_ativa_inicio_idx" ON "Recorrencia"("ativa", "inicio");
CREATE INDEX "Recorrencia_autorId_idx" ON "Recorrencia"("autorId");
CREATE INDEX "Demanda_recorrenciaId_idx" ON "Demanda"("recorrenciaId");

ALTER TABLE "Recorrencia" ADD CONSTRAINT "Recorrencia_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_recorrenciaId_fkey" FOREIGN KEY ("recorrenciaId") REFERENCES "Recorrencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
