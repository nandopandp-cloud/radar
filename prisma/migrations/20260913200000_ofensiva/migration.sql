-- Ofensiva Radar: dias em que a pessoa trabalhou no produto.
--
-- Uma linha por pessoa por dia. A chave única deixa o registro idempotente:
-- várias ações no mesmo dia só incrementam o contador, sem criar linhas novas.

CREATE TABLE "DiaAtivo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "dia" TIMESTAMP(3) NOT NULL,
    "acoes" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaAtivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DiaAtivo_usuarioId_dia_key" ON "DiaAtivo"("usuarioId", "dia");
CREATE INDEX "DiaAtivo_usuarioId_dia_idx" ON "DiaAtivo"("usuarioId", "dia");

ALTER TABLE "DiaAtivo" ADD CONSTRAINT "DiaAtivo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
