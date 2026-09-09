-- Foto de perfil como data URI. Opcional: quem não enviar continua com o
-- avatar de iniciais, então nenhuma linha existente precisa mudar.
ALTER TABLE "Usuario" ADD COLUMN "avatar" TEXT;
