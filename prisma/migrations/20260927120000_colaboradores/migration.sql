-- Colaboradores de uma demanda: pessoas que um admin adiciona além do
-- responsável. Têm as mesmas permissões dele e recebem o alerta de atraso.

CREATE TABLE "Colaborador" (
    "demandaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("demandaId","usuarioId")
);

CREATE INDEX "Colaborador_usuarioId_idx" ON "Colaborador"("usuarioId");

ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Colaborador" ADD CONSTRAINT "Colaborador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
