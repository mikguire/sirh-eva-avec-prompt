# ADR-0004 : Réponses d’erreur API au format RFC 7807 (Problem Details)

**Date :** 2026-05-04  
**Statut :** Accepté  
**Décideur :** Chef d’Orchestre (validation finale : Mickael)

## Contexte

`STANDARDS.md` impose une migration vers **RFC 7807** (`application/problem+json`) pour homogénéiser les erreurs côté clients (Flutter, web admin) et faciliter l’i18n / le support (champ `detail`, `instance`, extensions `ev:code`).

## Options envisagées

**Option A — Conserver le format Nest par défaut `{ statusCode, message }`**  
Pour : aucun travail.  
Contre : non aligné STANDARDS ; formats variables selon exception.

**Option B — Filtre global unique (`ProblemDetailsExceptionFilter`) pour `HttpException` + erreurs Prisma connues**  
Pour : une seule couche ; JSON stable ; extensible `ev:code`.  
Contre : les clients doivent migrer une fois du format historique.

**Option C — Bibliothèque tierce dédiée**  
Pour : fiches problèmes enrichies.  
Contre : dépendance et courbe d’apprentissage pour un périmètre encore modeste.

## Décision

**Option B** : filtre global Nest `ProblemDetailsExceptionFilter` enregistré via `APP_FILTER` dans `AppModule`, `Content-Type: application/problem+json`, champs `type`, `title`, `status`, `detail`, `instance` ; codes Prisma `P2002` / `P2025` mappés avec `ev:code` optionnel.

## Conséquences

**Positives :** alignement STANDARDS ; tests d’intégration peuvent assert sur `Content-Type` et `body.status`.

**Négatives / dette :** clients existants doivent parser Problem Details ; Swagger à enrichir progressivement avec exemples d’erreur.

**Impact agents :** Agent 8 / 7 mettent à jour les parseurs d’erreur mobile et web ; Agent 5 documente les `ev:code` au fil des modules.

## Critères de réévaluation

- Besoin de `type` URI stable par domaine métier (paie, congés) → catalogue d’URI + ADR complémentaire.  
- Internationalisation des `title`/`detail` → couche i18n ou codes uniquement côté API.

---

## Annexe — Catalogue initial `ev:code`

| Code | HTTP | Origine | Signification |
|------|------|---------|----------------|
| `EV_UNIQUE_VIOLATION` | 409 | Prisma `P2002` | Contrainte d’unicité (ex. email, clé métier). |
| `EV_NOT_FOUND` | 404 | Prisma `P2025` | Enregistrement attendu introuvable (update/delete). |
| `EV_PRISMA_*` | 500 | Autres codes Prisma | Erreur base non mappée — détail technique dans `detail` (à restreindre en prod). |

Toute nouvelle valeur `ev:code` **métier** (paie, congés) doit être ajoutée ici et référencée dans le PRD / OpenAPI.
