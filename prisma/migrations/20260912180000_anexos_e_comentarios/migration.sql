-- Anexos e comentários das demandas.
--
-- O conteúdo do arquivo fica em TEXT, como data URI — mesmo caminho já usado
-- pelo avatar do usuário, que dispensa serviço de storage externo. O limite de
-- 1MB por arquivo é validado na API, antes de chegar aqui.
--
-- Os dois guardam "autorNome" além da FK: assim o histórico continua legível
-- se a conta de quem comentou/anexou for removida, caso em que "autorId" vira
-- NULL. (Removida a conta do DONO da demanda, a demanda cai por cascade e
-- leva anexos e comentários junto — regra que já existia.)

CREATE TABLE "Anexo" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "conteudo" TEXT NOT NULL,
    "autorId" TEXT,
    "autorNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Anexo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Comentario" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "autorId" TEXT,
    "autorNome" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comentario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Anexo_demandaId_criadoEm_idx" ON "Anexo"("demandaId", "criadoEm");
CREATE INDEX "Comentario_demandaId_criadoEm_idx" ON "Comentario"("demandaId", "criadoEm");

-- Apagar a demanda leva junto anexos e comentários; apagar o usuário preserva
-- o registro e apenas solta o vínculo.
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Anexo" ADD CONSTRAINT "Anexo_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comentario" ADD CONSTRAINT "Comentario_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
