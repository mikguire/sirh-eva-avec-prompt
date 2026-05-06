# ADR-0003 : Webhooks Stripe — route publique, authentification par signature uniquement

**Date :** 2026-05-02  
**Statut :** Accepté  
**Décideur :** Chef d’Orchestre (validation finale : Mickael)  
**Référence audit :** P0-1 [docs/audit/AUDIT-EXISTANT-2026-05-02.md](../audit/AUDIT-EXISTANT-2026-05-02.md)

## Contexte

`BillingController` applique au niveau **classe** les garde-fous `JwtAuthGuard`, `TenantContextGuard` et `PermissionsGuard`. L’endpoint `POST /billing/webhook` est donc protégé comme une route métier : Stripe envoie un corps signé avec l’en-tête `Stripe-Signature`, **sans** Bearer JWT ni `x-tenant-id`. Résultat : le webhook est **inutilisable** en l’état (401/403 avant exécution du handler), ou les contournements manuels seraient non standard.

Le service `StripeSignatureService` et `NestFactory.create(..., { rawBody: true })` montrent une intention correcte de vérification cryptographique ; le problème est **uniquement** le routage / guards.

## Options envisagées

**Option A — Garder JWT sur le webhook et documenter un « token Stripe » fictif**  
Pour : aucun refactor.  
Contre : incompatible avec le modèle Stripe ; non viable.

**Option B — Découper : `BillingWebhookController` dédié (ou module séparé) sans JwtAuthGuard / sans TenantContextGuard ; vérification signature en premier ; idempotence conservée**  
Pour : aligné pratiques industrie ; Stripe documenté comme non authentifié par JWT.  
Contre : le tenant n’est plus dans le header — il faut **résoudre le tenant** via `Subscription.providerSubscriptionId` / `customer` dans le payload après parsing du JSON vérifié.

**Option C — `@Public()` + métadonnées JWT interne forgée**  
Pour : un seul contrôleur.  
Contre : patterns Nest « Public » à maintenir ; risque d’oublier d’exclure `TenantContextGuard` pour cette route ; moins clair qu’un contrôleur isolé.

## Décision

**Option B** : extraire (ou reconfigurer explicitement) le webhook dans un chemin **sans** `JwtAuthGuard` et **sans** obligation `x-tenant-id`. L’**authentification** de la requête repose sur **`StripeSignatureService.verify`** + secret `STRIPE_WEBHOOK_SECRET`. L’**autorisation métier** repose sur la correspondance des identifiants Stripe avec des lignes `Subscription` existantes (mise à jour uniquement si `providerSubscriptionId` / tenant cohérents).

Toute autre intégration tierce (Mobile Money, impots.gov, etc.) suit le même principe : **signature ou secret partagé dédié**, pas la session utilisateur RH.

## Conséquences

**Positives** : webhooks fonctionnels ; surface d’attaque réduite à la vérification HMAC + logique idempotence ; pas de token utilisateur à exposer.

**Négatives / dette** : tests d’intégration doivent couvrir payload mal formé, signature invalide, replay `lastWebhookEventId`, et subscription inconnue (no-op ou log alert selon politique produit).

**Impact agents** : Agent 8 refactor `billing` ; Agent 9 ajoute « webhook 401 » à la checklist incident billing.

## Critères de réévaluation

- Passage à Stripe Connect avec signatures multiples ou endpoints séparés par compte plateforme.  
- Besoin d’associer l’événement à un tenant **avant** toute ligne `Subscription` (onboarding) → étendre le handler avec table de mapping `stripeCustomerId` → `tenantId`.
