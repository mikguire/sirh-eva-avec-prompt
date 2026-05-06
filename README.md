# SIRH EVA — monorepo

Plateforme RH multi-tenant : **API NestJS + Prisma** (`backend/`), **app mobile Flutter** (`mobile/`), **design system React** (`design-system/`), directives orchestrateur (`.orchestrator/`).

## Démarrage rapide

### Base de données & cache (Docker)

À la racine du dépôt :

```bash
docker compose up -d
```

Puis dans `backend/.env`, pointez `DATABASE_URL` et `REDIS_URL` vers ces services (voir `backend/.env.example`).

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
- Tests d’intégration (DB `eva_test`) : `npm run test:int`

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
