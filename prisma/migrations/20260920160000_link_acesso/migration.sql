-- Links de acesso: um admin gera um link de uso único para entrar como outro
-- usuário e dar suporte vendo o que a pessoa vê.
--
-- É um desvio deliberado da autenticação normal, então tudo fica registrado:
-- quem gerou, para quem, quando expirou, quando foi usado e de qual IP. Sem
-- essa trilha a personificação apagaria a autoria das ações.
--
-- "tokenHash" guarda apenas o SHA-256 do token que viaja na URL — o valor em
-- claro existe só no instante da criação. Assim um vazamento do banco não
-- permite reaproveitar nenhum link.

CREATE TABLE "LinkAcesso" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "alvoId" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "usadoEm" TIMESTAMP(3),
    "usadoIp" TEXT,
    "revogadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkAcesso_pkey" PRIMARY KEY ("id")
);

-- A busca no resgate é pelo hash; ela precisa ser única e indexada.
CREATE UNIQUE INDEX "LinkAcesso_tokenHash_key" ON "LinkAcesso"("tokenHash");
CREATE INDEX "LinkAcesso_alvoId_idx" ON "LinkAcesso"("alvoId");
CREATE INDEX "LinkAcesso_adminId_criadoEm_idx" ON "LinkAcesso"("adminId", "criadoEm");
CREATE INDEX "LinkAcesso_expiraEm_idx" ON "LinkAcesso"("expiraEm");

-- Removida qualquer uma das duas contas, os links dela perdem o sentido.
ALTER TABLE "LinkAcesso" ADD CONSTRAINT "LinkAcesso_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LinkAcesso" ADD CONSTRAINT "LinkAcesso_alvoId_fkey" FOREIGN KEY ("alvoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
