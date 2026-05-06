# ADR-0002 : RLS PostgreSQL + Prisma — obligation de contexte tenant par requête

**Date :** 2026-05-02  
**Statut :** Accepté  
**Décideur :** Chef d’Orchestre (validation finale : Mickael)  
**Référence audit :** P0-2 [docs/audit/AUDIT-EXISTANT-2026-05-02.md](../audit/AUDIT-EXISTANT-2026-05-02.md)

## Contexte

Le script `backend/sql/rls.sql` active la RLS et suppose `current_setting('app.current_tenant')`. Sans injection systématique de ce réglage côté runtime pour les opérations Prisma sur tables scopées tenant, la défense repose surtout sur le code applicatif (`tenantId` dans les `where`). En production, une régression (ou une requête raw oubliée) peut exposer des données cross-tenant si la RLS n’est pas effective en base **et** le contexte session n’est pas posé.

## Options envisagées

**Option A — Désactiver RLS, tout filtrer en applicatif**  
Pour : simplicité Prisma.  
Contre : une seule requête oubliée = fuite ; non conforme principe « sécurité > vitesse ».

**Option B — Extension Prisma `$extends`** (`query.$allModels.$allOperations`) avec `set_config('app.current_tenant', …, true)` dans une **`$transaction` batch** commune avec la requête métier (successeur du middleware **`$use`**, retiré en Prisma ≥ 6.14).  
Pour : RLS alignée avec le guard HTTP ; défense en profondeur.  
Contre : transactions imbriquées (ex. `$transaction` interactive métier) — surveiller perfs et comportement ; veille PgBouncer (mode transaction vs session).

**Option C — Schéma par tenant PostgreSQL**  
Pour : isolation forte.  
Contre : migration lourde depuis le modèle `tenantId` actuel ; hors MVP.

## Décision

**Option B** : implémenter systématiquement le contexte DB tenant via `set_config('app.current_tenant', …, true)` (transaction batch avec chaque opération Prisma sur modèle nommé, voir `PrismaService`), complété par les `where: { tenantId }` existants. Documenter dans le runbook déploiement que `sql/rls.sql` doit être appliqué **après** migrations Prisma.

## Conséquences

**Positives :** RLS utile en dernier rempart ; alignement avec README backend.

**Négatives / dette :** tests d’intégration doivent couvrir « sans SET → accès refusé » sur au moins une table RLS ; veille sur Prisma + PgBouncer (mode transaction vs session).

**Impact agents :** Agent 8 implémente + tests ; Agent 9 inclut « vérifier RLS active » dans playbook incident fuite données.

## Critères de réévaluation

- Passage à PgBouncer transaction pooling incompatible avec `SET` → étudier `SET` via `search_path` ou RLS basée sur `current_user` / JWT claims natifs PG.  
- Montée en charge nécessitant sharding par tenant → revoir Option C.

---

## Annexe — Exploitation PostgreSQL (à ne pas confondre avec Prisma)

1. **Activation des politiques RLS** : le fichier **`backend/sql/rls.sql`** doit être **appliqué sur chaque base** (dev, staging, prod). Le runtime Nest + Prisma injecte `set_config('app.current_tenant', …)` pour que les politiques puissent s’évaluer ; **il ne crée pas** les politiques ni n’active la RLS à votre place. Sans exécution du script (ou équivalent pipeline), la RLS **n’existe pas** en base.
2. **Évolution du schéma** : tout changement Prisma (nouvelle table, colonne, renommage) peut **casser ou rendre obsolète** des politiques ou des références dans `rls.sql`. **Revérifier et réappliquer** (ou patcher) ce script après chaque évolution de schéma concernée par la RLS ; ajouter des tests / checklist revue si besoin.
