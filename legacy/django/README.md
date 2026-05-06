# Emplacement prévu — backend Django / DRF (hors monorepo actuel)

Le dépôt principal **ne contient pas** le legacy Django décrit dans la vision produit (multi-tenant, paie BF, Celery, etc.).

## Actions recommandées

1. **Cloner ou lier** le dépôt Django existant à côté de ce workspace, ou ajouter un **sous-module Git** pointant vers le repo canonique.
2. Documenter dans un ADR la **source de vérité** par domaine (Nest vs Django) après inventaire des endpoints et modèles.
3. Ne pas dupliquer la logique CNSS / IUTS / congés dans Nest sans audit du code Python correspondant.

Voir aussi : [ADR-0001](../../docs/adr/0001-perimetre-source-backend-et-mobile.md).
