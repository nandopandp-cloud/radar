-- Rastreia as trocas de data de entrega.
--
-- O analista deixa de poder alterar o prazo no dia do vencimento (regra
-- aplicada na API). Para o admin enxergar quem contorna isso adiando na
-- véspera, cada troca fica registrada e a demanda guarda quantas vezes um
-- analista a adiou.

ALTER TABLE "Demanda" ADD COLUMN "reagendamentos" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Reagendamento" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "prazoAnterior" TIMESTAMP(3) NOT NULL,
    "prazoNovo" TIMESTAMP(3) NOT NULL,
    "diasAntes" INTEGER NOT NULL,
    "usuarioId" TEXT,
    "usuarioNome" TEXT NOT NULL,
    "perfil" TEXT NOT NULL,
    "personificadoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reagendamento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reagendamento_demandaId_criadoEm_idx" ON "Reagendamento"("demandaId", "criadoEm");

ALTER TABLE "Reagendamento" ADD CONSTRAINT "Reagendamento_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
