-- Menções em comentários.
--
-- Quem é marcado com @ num comentário vira uma linha aqui. A tabela tem duas
-- funções: é a fonte de quem notificar por e-mail e é o que concede à pessoa
-- mencionada acesso àquela demanda (ver lib/acesso.ts) — sem ela, o link do
-- e-mail levaria a um 403.
--
-- Guardar a menção como linha, e não como marcação dentro do texto, evita
-- reinterpretar o comentário a cada leitura e sobrevive à troca de nome de
-- quem foi mencionado.

CREATE TABLE "Mencao" (
    "id" TEXT NOT NULL,
    "comentarioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mencao_pkey" PRIMARY KEY ("id")
);

-- A mesma pessoa não é marcada duas vezes no mesmo comentário, ainda que o
-- nome dela apareça repetido no texto.
CREATE UNIQUE INDEX "Mencao_comentarioId_usuarioId_key" ON "Mencao"("comentarioId", "usuarioId");
CREATE INDEX "Mencao_usuarioId_idx" ON "Mencao"("usuarioId");

-- Apagado o comentário, a menção cai junto — e com ela o acesso que concedia.
-- Removida a conta, idem: sem usuário não há acesso a conceder nem e-mail a enviar.
ALTER TABLE "Mencao" ADD CONSTRAINT "Mencao_comentarioId_fkey" FOREIGN KEY ("comentarioId") REFERENCES "Comentario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Mencao" ADD CONSTRAINT "Mencao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
