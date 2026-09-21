-- Libera por pessoa os recursos ainda em avaliação — hoje, a área
-- "Meus arquivos" e o anexar a partir do Google Drive.
--
-- A flag existe porque essas telas entram primeiro na conta de demonstração,
-- para a experiência ser validada antes de valer para o time inteiro. O
-- padrão é falso: ninguém passa a ver nada por causa desta migration.

ALTER TABLE "Usuario" ADD COLUMN "recursosExperimentais" BOOLEAN NOT NULL DEFAULT false;
