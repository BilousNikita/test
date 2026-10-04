#!/bin/sh
# Container start-up: match Prisma to DATABASE_URL, sync the schema, optionally seed, then start.
set -e

provider() { sed -n '/^datasource db/,/^}/p' prisma/schema.prisma | sed -n 's/.*provider *= *"\([a-z]*\)".*/\1/p'; }

BEFORE=$(provider)
unset DATABASE_PROVIDER # at runtime the provider always follows DATABASE_URL
node scripts/select-db-provider.mjs
if [ "$BEFORE" != "$(provider)" ]; then
  echo "[entrypoint] database provider changed – regenerating Prisma client"
  node_modules/.bin/prisma generate
fi

# Schema sync ("migration"). Refuses destructive changes, so existing data is never dropped silently.
echo "[entrypoint] syncing database schema"
for i in 1 2 3 4 5 6 7 8 9 10; do
  node_modules/.bin/prisma db push --skip-generate && break
  echo "[entrypoint] database not ready yet ($i/10) – retrying in 3s"; sleep 3
  [ "$i" = 10 ] && exit 1
done

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] seeding (idempotent)"
  node_modules/.bin/tsx prisma/seed.ts
fi

exec "$@"
