# SIRH EVA — monorepo

Plateforme RH multi-tenant : **API NestJS + Prisma** (`backend/`), **app mobile Flutter** (`mobile/`), **design system React** (`design-system/`), directives orchestrateur (`.orchestrator/`).

## Démarrage rapide

### Base de données & cache (Docker)

À la racine du dépôt :

```bash
docker compose up -d
```

Ou avec attente des healthchecks Compose (si votre version le supporte) :

```bash
make compose-up
```

Puis dans `backend/.env`, pointez `DATABASE_URL` et `REDIS_URL` vers ces services (voir `backend/.env.example`).

### Chaîne Docker + tests d’intégration (une commande)

À la racine, après `cd backend && npm install` (première fois) :

```bash
make integration-full
```

Équivalent : démarrage des services Docker puis, dans `backend/`, `npm run test:integration` (db check TCP + auth, migrate deploy, seed, puis Jest). Si Compose est déjà démarré : `make integration`.

Si Postgres n’écoute pas sur `127.0.0.1:5432` (par exemple port personnalisé avec `EVA_POSTGRES_PORT`), définissez `INTEGRATION_DATABASE_URL` pour pointer vers la même instance (voir `backend/package.json`, script `test:integration:prepare`).

**Limitation :** Docker (et le plugin Compose) est requis pour cette chaîne.

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

- OpenAPI : `http://localhost:3000/api/docs`
- Tests unitaires : `npm test`
- Tests d’intégration (DB `eva_test`) : `npm run test:int` ou `make integration` depuis la racine — URL Postgres des tests : par défaut `postgres/postgres@127.0.0.1:5432/eva_test` (voir `backend/README.md`, surcharge `INTEGRATION_DATABASE_URL`).

### Mobile (Flutter)

```bash
cd mobile
flutter create . --project-name eva_mobile   # si dossiers android/ios absents
flutter pub get
flutter run
```

### Legacy Django

Le code Django n’est pas dans ce repo ; voir `legacy/django/README.md` et l’audit `docs/audit/AUDIT-EXISTANT-2026-05-02.md`.

## Documentation projet

- [PLANNING.md](PLANNING.md) — roadmap et sprints  
- [STANDARDS.md](STANDARDS.md) — conventions  
- [docs/adr/](docs/adr/) — décisions d’architecture (dont **RFC 7807** erreurs API, **Throttler** rate limit)  
- [docs/runbook/AGENT10-rate-limiting-et-proxy.md](docs/runbook/AGENT10-rate-limiting-et-proxy.md) — exploitation : quotas, `TRUST_PROXY`, 429  
