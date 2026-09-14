#!/usr/bin/env bash
#
# Aplica as migrations pendentes no banco de produção (Neon).
#
# Existe porque o deploy da Vercel roda apenas `prisma generate && next build`
# (veja vercel.json) — ele nunca aplica migrations. Sem rodar isto antes de
# subir código que depende de tabelas novas, a aplicação quebra em produção.
#
# O `.env` da raiz aponta para SQLite (dev) e venceria sobre o de produção,
# porque o Prisma o carrega por padrão. Por isso as variáveis de produção são
# exportadas explicitamente aqui.
#
# Uso:
#   ./scripts/aplicar-migration.sh          # mostra o que está pendente
#   ./scripts/aplicar-migration.sh --aplicar # aplica de fato
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.production.local ]; then
  echo "erro: .env.production.local não encontrado." >&2
  echo "Ele guarda as credenciais do Neon e não é versionado." >&2
  exit 1
fi

# Carrega as variáveis de produção sobrescrevendo o .env de dev.
set -a
# shellcheck disable=SC1091
. ./.env.production.local
set +a

export DIRECT_URL="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-$DATABASE_URL}}"

echo "Banco: $(printf '%s' "$DATABASE_URL" | sed -E 's|.*@|…@|; s|\?.*||')"
echo

if [ "${1:-}" = "--aplicar" ]; then
  echo "Aplicando migrations pendentes…"
  npx prisma migrate deploy
  echo
  echo "Pronto. Confira o status:"
  npx prisma migrate status
else
  echo "Migrations pendentes (nada foi aplicado):"
  npx prisma migrate status
  echo
  echo "Para aplicar de fato:  ./scripts/aplicar-migration.sh --aplicar"
fi
