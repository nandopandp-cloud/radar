-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colaborador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "equipe" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Colaborador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Demanda" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "solicitante" TEXT,
    "dataPrevista" TIMESTAMP(3) NOT NULL,
    "vezesAdiada" INTEGER NOT NULL DEFAULT 0,
    "concluidaEm" TIMESTAMP(3),
    "colaboradorId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Demanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "colaboradorId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dataReferencia" TIMESTAMP(3) NOT NULL,
    "qtdDemandas" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ENVIADO',
    "detalhe" TEXT,
    "enviadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

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

-- AddForeignKey
ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "Colaborador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
