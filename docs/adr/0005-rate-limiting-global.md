# ADR-0005 : Rate limiting global par IP (Throttler) — exclusion webhook Stripe

**Date :** 2026-05-04  
**Statut :** Accepté  
**Décideur :** Chef d’Orchestre (validation finale : Mickael)

## Contexte

`STANDARDS.md` §5 recommande du rate limiting sur `login`, `refresh`, `webhook` et endpoints admin. Les appels **Stripe webhook** sont volumineux côté fournisseur (retries) et ne doivent pas être bloqués par un quota API générique partagé avec les clients RH.

## Options envisagées

**Option A — Aucun rate limiting**  
Pour : zéro config.  
Contre : exposition brute-force login / coût DoS.

**Option B — Rate limit global + exclusion explicite du chemin webhook + `SkipThrottle` sur le contrôleur webhook**  
Pour : simple à opérer ; couvre l’essentiel ; double sécurité (path + décorateur).  
Contre : pas de quotas différenciés par rôle sans évolution (throttlers nommés).

**Option C — API Gateway (Cloudflare, Kong) uniquement**  
Pour : centralisé hors app.  
Contre : non présent sur tous les déploiements VPS actuels.

## Décision

**Option B** : `@nestjs/throttler` — **150 requêtes / minute / IP** par défaut (`ThrottlerGuard` global), **`skipIf`** sur l’URL contenant `/billing/webhook`, et **`@SkipThrottle()`** sur `BillingWebhookController`. Les réponses **429** sont formatées en **RFC 7807** par le filtre existant.

**Affinage auth (2026-05-04)** : sur `AuthController` (login, refresh, logout), **`@Throttle({ default: { limit: 25, ttl: 60_000 } })`** — **25 requêtes / minute / IP** sur ces routes (plus strict que le défaut 150), pour limiter le brute-force sans toucher au reste de l’API.

**Derrière reverse-proxy** : variable **`TRUST_PROXY`** (`true` ou `1`) → `app.set("trust proxy", 1)` sur l’application Nest/Express pour que l’IP vue par le Throttler reflète le client réel via **`X-Forwarded-For`** (sinon toutes les requêtes peuvent compter comme la même IP proxy).

## Conséquences

**Positives :** limite les abus génériques ; webhook Stripe stable.

**Négatives / dette :** limites non affinées par tenant (IP seule) ; un futur **throttler nommé** pourra cadrer `auth` plus strict sans toucher au reste (voir critères).

**Impact agents :** clients mobiles doivent gérer **429** + `problem+json` ; **Agent 10** : runbook [AGENT10-rate-limiting-et-proxy.md](../runbook/AGENT10-rate-limiting-et-proxy.md).

## Critères de réévaluation

- **`TRUST_PROXY`** : à activer uniquement si le proxy est de confiance (sinon risque de spoof `X-Forwarded-For`).  
- Ajuster le plafond **25/min** sur auth si UX mobile / refresh trop agressif → documenter le nouveau seuil ici et dans `backend/README.md`.
