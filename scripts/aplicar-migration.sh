#!/usr/bin/env bash
#
# Aplica as migrations pendentes no banco de produção (Neon).
#
# Existe porque o deploy da Vercel roda apenas `prisma generate && next build`
# (veja vercel.json) — ele nunca aplica migrations. Sem rodar isto antes de
# subir código que depende de tabelas novas, a aplicação quebra em produção.
#
# O pulo do gato: o Prisma sempre carrega o `.env` do projeto e ele VENCE sobre
# variáveis exportadas no shell. Como esse `.env` aponta para SQLite (dev),
# exportar DATABASE_URL não basta — o arquivo precisa sair do caminho durante a
# execução. É o que este script faz, restaurando-o ao terminar, inclusive se
# der erro ou se você interromper com Ctrl+C.
#
# Uso:
#   ./scripts/aplicar-migration.sh            # mostra o que está pendente
#   ./scripts/aplicar-migration.sh --aplicar  # aplica de fato
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env.production.local ]; then
  echo "erro: .env.production.local não encontrado." >&2
  echo "Ele guarda as credenciais do Neon e não é versionado." >&2
  exit 1
fi

# Restaura o .env de dev aconteça o que acontecer.
restaurar() {
  if [ -f .env.migracao-backup ]; then
    mv -f .env.migracao-backup .env
  fi
}
trap restaurar EXIT INT TERM

if [ -f .env ]; then
  cp .env .env.migracao-backup
fi

# Monta um .env só com o que a migration precisa, apontando para produção.
python3 - <<'PY'
import re

valores = {}
for linha in open('.env.production.local'):
    linha = linha.strip()
    if not linha or linha.startswith('#') or '=' not in linha:
        continue
    chave, valor = linha.split('=', 1)
    valores[chave.strip()] = valor.strip().strip('"').strip("'")

def valida(chave):
    """Devolve a URL só se ela for mesmo uma URL de Postgres.

    O .env.production.local traz DIRECT_URL com um valor placeholder (sem
    "://"), que faria o Prisma abortar com P1013. Por isso não basta checar
    se a chave existe.
    """
    v = valores.get(chave, '')
    return v if v.startswith(('postgresql://', 'postgres://')) else None

url = valida('DATABASE_URL')
# migrate deploy precisa da conexão direta: o pooler do Neon não aceita o DDL
# em transação longa. Preferimos as chaves sem pooler, nesta ordem.
direta = (valida('DIRECT_URL') or valida('DATABASE_URL_UNPOOLED')
          or valida('POSTGRES_URL_NON_POOLING') or url)

if not url:
    raise SystemExit('erro: DATABASE_URL ausente ou inválida em .env.production.local')

with open('.env', 'w') as saida:
    saida.write(f'DATABASE_URL="{url}"\n')
    saida.write(f'DIRECT_URL="{direta}"\n')

mascarado = re.sub(r'://[^@]*@', '://…@', url).split('?')[0]
print(f'Banco: {mascarado}')
PY

echo

if [ "${1:-}" = "--aplicar" ]; then
  echo "Aplicando migrations pendentes…"
  echo
  npx prisma migrate deploy
  echo
  echo "Status final:"
  npx prisma migrate status || true
else
  echo "Migrations pendentes (nada foi aplicado):"
  echo
  npx prisma migrate status || true
  echo
  echo "Para aplicar de fato:  ./scripts/aplicar-migration.sh --aplicar"
fi
