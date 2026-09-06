-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "equipe" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Demanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "solicitante" TEXT,
    "dataPrevista" DATETIME NOT NULL,
    "vezesAdiada" INTEGER NOT NULL DEFAULT 0,
    "concluidaEm" DATETIME,
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" DATETIME NOT NULL,
    CONSTRAINT "Demanda_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dataReferencia" DATETIME NOT NULL,
    "qtdDemandas" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENVIADO',
    "detalhe" TEXT,
    "enviadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Colaborador_email_key" ON "Colaborador"("email");

-- CreateIndex
CREATE INDEX "Colaborador_ativo_idx" ON "Colaborador"("ativo");

-- CreateIndex
CREATE INDEX "Demanda_status_dataPrevista_idx" ON "Demanda"("status", "dataPrevista");

-- CreateIndex
CREATE INDEX "Demanda_colaboradorId_idx" ON "Demanda"("colaboradorId");

-- CreateIndex
CREATE INDEX "Alerta_dataReferencia_idx" ON "Alerta"("dataReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "Alerta_colaboradorId_dataReferencia_key" ON "Alerta"("colaboradorId", "dataReferencia");
