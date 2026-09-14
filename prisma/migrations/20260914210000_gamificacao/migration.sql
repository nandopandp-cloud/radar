-- Gamificação do perfil: XP/nível, conquistas desbloqueadas e missões.
--
-- Só o que varia por pessoa mora aqui; os catálogos (títulos, metas, XP)
-- ficam em lib/gamificacao.ts, para mudar sem migration.

-- CreateTable
CREATE TABLE "Progresso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Progresso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conquista" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "emQue" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conquista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Missao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "concluidaEm" TIMESTAMP(3),
    "xpCreditado" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Missao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Progresso_usuarioId_key" ON "Progresso"("usuarioId");

-- CreateIndex
CREATE INDEX "Conquista_usuarioId_idx" ON "Conquista"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Conquista_usuarioId_chave_key" ON "Conquista"("usuarioId", "chave");

-- CreateIndex
CREATE INDEX "Missao_usuarioId_idx" ON "Missao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Missao_usuarioId_chave_key" ON "Missao"("usuarioId", "chave");

-- AddForeignKey
ALTER TABLE "Progresso" ADD CONSTRAINT "Progresso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conquista" ADD CONSTRAINT "Conquista_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Missao" ADD CONSTRAINT "Missao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
