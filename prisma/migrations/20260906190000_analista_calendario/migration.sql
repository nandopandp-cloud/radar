-- Radar MSA: o analista passa a lançar as próprias demandas e a receber os alertas.
-- Usuario e Colaborador viram a mesma entidade.

-- 1) Usuario ganha os campos que vinham de Colaborador.
ALTER TABLE "Usuario" ADD COLUMN "equipe" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "perfil" TEXT NOT NULL DEFAULT 'ANALISTA';
ALTER TABLE "Usuario" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;

-- Quem já tinha acesso ao painel era administrador.
UPDATE "Usuario" SET "perfil" = 'ADMIN';

-- 2) Cada Colaborador sem login vira um Usuario (senha inutilizável até ser definida).
INSERT INTO "Usuario" ("id", "email", "senhaHash", "nome", "equipe", "perfil", "ativo", "criadoEm")
SELECT c."id", c."email", '!', c."nome", c."equipe", 'ANALISTA', c."ativo", c."criadoEm"
FROM "Colaborador" c
WHERE NOT EXISTS (SELECT 1 FROM "Usuario" u WHERE u."email" = c."email");

-- 3) Demanda: dataPrevista -> prazo, colaboradorId -> autorId.
ALTER TABLE "Demanda" RENAME COLUMN "dataPrevista" TO "prazo";
ALTER TABLE "Demanda" RENAME COLUMN "vezesAdiada" TO "vezesAlertada";
ALTER TABLE "Demanda" RENAME COLUMN "colaboradorId" TO "autorId";

-- Aponta cada demanda para o Usuario de mesmo e-mail do antigo colaborador.
UPDATE "Demanda" d
SET "autorId" = u."id"
FROM "Colaborador" c
JOIN "Usuario" u ON u."email" = c."email"
WHERE d."autorId" = c."id" AND u."id" <> c."id";

DROP INDEX IF EXISTS "Demanda_status_dataPrevista_idx";
DROP INDEX IF EXISTS "Demanda_colaboradorId_idx";
ALTER TABLE "Demanda" DROP CONSTRAINT IF EXISTS "Demanda_colaboradorId_fkey";

-- Remove demandas órfãs antes de criar a FK.
DELETE FROM "Demanda" d WHERE NOT EXISTS (SELECT 1 FROM "Usuario" u WHERE u."id" = d."autorId");

ALTER TABLE "Demanda" ADD CONSTRAINT "Demanda_autorId_fkey"
  FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Demanda_status_prazo_idx" ON "Demanda"("status", "prazo");
CREATE INDEX "Demanda_autorId_prazo_idx" ON "Demanda"("autorId", "prazo");

-- 4) Alerta: colaboradorId -> usuarioId.
ALTER TABLE "Alerta" RENAME COLUMN "colaboradorId" TO "usuarioId";

UPDATE "Alerta" a
SET "usuarioId" = u."id"
FROM "Colaborador" c
JOIN "Usuario" u ON u."email" = c."email"
WHERE a."usuarioId" = c."id" AND u."id" <> c."id";

DELETE FROM "Alerta" a WHERE NOT EXISTS (SELECT 1 FROM "Usuario" u WHERE u."id" = a."usuarioId");

DROP INDEX IF EXISTS "Alerta_colaboradorId_dataReferencia_key";
CREATE UNIQUE INDEX "Alerta_usuarioId_dataReferencia_key" ON "Alerta"("usuarioId", "dataReferencia");
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5) Colaborador deixa de existir.
DROP TABLE "Colaborador";

CREATE INDEX "Usuario_ativo_idx" ON "Usuario"("ativo");
