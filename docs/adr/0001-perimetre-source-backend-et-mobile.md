# ADR-0001 : Périmètre du dépôt — absence Django et mobile natif ; source de vérité implémentation

**Date :** 2026-05-02  
**Statut :** Accepté  
**Décideur :** Chef d’Orchestre (validation finale : Mickael)  
**Référence audit :** [docs/audit/AUDIT-EXISTANT-2026-05-02.md](../audit/AUDIT-EXISTANT-2026-05-02.md)

## Contexte

La documentation produit décrit un socle **Django 5 + DRF** et une app **Flutter**. L’audit du dépôt courant ne trouve **aucun** code Python/Django ni projet Flutter (`pubspec.yaml`, `.dart`). Le backend présent est **NestJS + Prisma** ; l’UI livrée est un **design system React** (composants responsive dont `MobileDataTable`), pas un artefact store mobile.

Les agents et la planification doivent éviter les hypothèses « Django déjà là » ou « mobile = Flutter dans ce repo » sans créer double travail ou des merges sur du vide.

## Options envisagées

**Option A — Déclarer ce dépôt erroné et tout arrêter jusqu’à import du legacy Django + Flutter**  
Pour : alignement strict doc canonique.  
Contre : bloque toute livraison sur le code Nest déjà écrit ; le legacy n’est pas accessible dans l’arborescence auditée.

**Option B — Traiter Nest + Prisma comme seule source de vérité et ignorer Django définitivement**  
Pour : simplicité d’équipe.  
Contre : perte du capital métier BF supposé dans Django hors repo ; risque réglementaire si des barèmes y vivent déjà.

**Option C — Périmètre explicite : ce dépôt = API + design web ; legacy Django / app Flutter hors dépôt ou à ajouter ; convergence par ADR module par module**  
Pour : honnêteté sur l’état ; capitalise sur Nest ; garde la porte ouverte au legacy.  
Contre : nécessite discipline (pas de duplication métier paie sans inventaire).

## Décision

**Option C** est acceptée. **Fait audité** : le dépôt ne contient pas Django ni Flutter. **Source de vérité pour les merges et la QA** : le code présent (Nest, Prisma, `design-system/`). Toute référence au « backend Django » dans les specs est traitée comme **externe** jusqu’à import ou lien documenté (URL repo, dump OpenAPI, etc.).

## Conséquences

**Positives** : planning et ADR alignés sur la réalité ; pas d’attente fictive sur des dossiers absents.

**Négatives / dette** : si Mickael possède un autre repo Django, une action **hors code** est requise (clone, sous-module, ou doc lien) avant de dupliquer la logique métier BF dans Nest.

**Impact agents** : Agent 8 travaille sur Nest uniquement ici ; Agent 7 (Flutter) ne démarre qu’après création du dossier `mobile/` ou repo satellite ; Agent 5 (PRD) distingue « spec cible » vs « implémenté dans ce monorepo ».

## Critères de réévaluation

- Ajout effectif de `backend-django/` ou `mobile/` dans le monorepo.  
- Décision sponsor de fusionner ou remplacer Nest par Django (nouvel ADR avec ROI).