# Runbook — Rate limiting & proxy (Agent 10)

**Périmètre :** exploitation production de l’API EVA (`backend/`) — quotas Throttler, IP client, variable `TRUST_PROXY`.  
**Références :** [ADR-0005](../adr/0005-rate-limiting-global.md), [ADR-0004](../adr/0004-reponses-erreur-rfc7807.md), `backend/README.md`, `backend/.env.example`.

---

## 1. Seuils actuels (à tenir à jour si le code change)

| Zone | Limite | Fenêtre | Remarque |
|------|--------|---------|----------|
| API par défaut | **150** requêtes | **1 minute** | Par IP « vue » par Nest (voir §2) |
| `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` | **25** requêtes | **1 minute** | Plus strict que le défaut |
| `POST /api/v1/billing/webhook` | **aucun** quota Throttler | — | Exclu par `skipIf` sur l’URL **et** `@SkipThrottle()` sur le contrôleur |

Les dépassements renvoient **HTTP 429** avec corps **`application/problem+json`** (RFC 7807), comme les autres erreurs filtrées.

---

## 2. IP client et reverse-proxy (`TRUST_PROXY`)

Sans **`trust proxy`**, l’adresse IP utilisée pour le Throttler est celle de la **connexion TCP** (souvent l’IP du load balancer ou du reverse-proxy). Tout le trafic peut alors **partager un seul bucket** et saturer le quota à tort.

- **`TRUST_PROXY=false`** (défaut dans `.env.example`) : adapté au **bind direct** sur le port (dev, petit déploiement sans proxy).
- **`TRUST_PROXY=true`** ou **`1`** : active **`app.set("trust proxy", 1)`** (une couche de proxy de confiance). Express dérive l’IP client depuis **`X-Forwarded-For`** pour le Throttler.

**Risque sécurité :** n’activer `TRUST_PROXY` que si le **premier** hop réseau vers Nest est **votre** proxy (Nginx, Traefik, ALB, etc.) qui **réécrit ou supprime** les en-têtes `X-Forwarded-*` entrants non fiables. Sinon un client peut **fabriquer** `X-Forwarded-For` et contourner ou abuser du rate limit.

**Checklist déploiement derrière proxy :**

1. Le proxy termine TLS et envoie le trafic vers Nest sur un réseau privé.
2. Le proxy positionne `X-Forwarded-For` avec la **vraie** IP client (append standard).
3. `TRUST_PROXY=true` sur l’instance Nest derrière ce proxy uniquement.
4. Après mise en prod : vérifier qu’un client réel qui dépasse la limite reçoit bien **429** (et pas tout le monde en même temps).

---

## 3. Observabilité

- **Logs applicatifs :** le filtre `ProblemDetailsExceptionFilter` émet un **`Logger.warn`** sur chaque **429** avec le préfixe structuré `rate_limited`, la méthode HTTP, le chemin (`path=`) et le marqueur **`eva.http_status=429`** (grep / agrégation ELK, Datadog, etc.).
- **Métrique / log :** corréler les **429** avec `instance` / `detail` du Problem Details et, si possible, l’IP côté proxy (sans stocker d’email en clair dans les logs applicatifs inutiles).
- **Alerte :** pic de **429** sur `/auth/*` peut indiquer brute-force ou intégration trop agressive (refresh en boucle).
- **Stripe :** le webhook ne doit **pas** être limité par Throttler ; en cas de 429 sur `/billing/webhook`, vérifier que l’URL matche bien `skipIf` et que `@SkipThrottle()` est toujours présent sur `BillingWebhookController`.

---

## 4. Ajustement des seuils (process)

1. Modifier les constantes dans le code (`app.module.ts`, `auth.controller.ts`) ou introduire des **throttlers nommés** si besoin de plusieurs quotas.
2. Mettre à jour **ADR-0005**, ce runbook, **`STANDARDS.md`** §5 et **`backend/README.md`** en même temps que la PR.
3. Prévenir les équipes **mobile / intégrations** (comportement 429 + backoff).

---

## 5. Tests rapides manuels

```bash
# Exemple : déclencher 429 sur auth (adapter l’URL et le corps)
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"x","password":"y","tenantId":"z"}'; done
```

On doit voir des **401** puis des **429** une fois la fenêtre minute saturée pour cette IP.
