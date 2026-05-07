# Racine du monorepo — Docker + tests d'intégration backend (reproductible).
# Prérequis : Docker avec plugin Compose v2 (idéalement avec support `up --wait`).
#
# Postgres du compose publie par défaut le port 5432 (base `eva_test`).
# Si vous utilisez un autre port (ex. EVA_POSTGRES_PORT=5433), exportez aussi :
#   export INTEGRATION_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/eva_test
# puis `make integration` ou `make integration-full`.

.PHONY: compose-up integration integration-full

BACKEND_DIR := backend

compose-up:
	@if docker compose up --help 2>&1 | grep -q '[[:space:]]--wait'; then \
		docker compose up -d --wait; \
	else \
		docker compose up -d; \
		echo "Avertissement : Compose sans --wait ; attendez que Postgres/Redis soient prêts avant les tests." >&2; \
	fi

integration:
	cd "$(BACKEND_DIR)" && npm run test:integration

integration-full: compose-up integration
