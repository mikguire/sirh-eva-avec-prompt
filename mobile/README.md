# SIRH EVA — Application mobile (Flutter)

Stack imposée : **Flutter**, **Riverpod**, **Clean Architecture**, **Dio**, **Hive**, **GoRouter**.

## Prérequis

- [Flutter SDK](https://docs.flutter.dev/get-started/install) 3.24+ (Dart 3.5+)

## Première génération des dossiers `android/` et `ios/`

Si absents (repo minimal) :

```bash
cd mobile
flutter create . --project-name eva_mobile
```

## Commandes

```bash
cd mobile
flutter pub get
flutter analyze
flutter run
```

## Structure

- `lib/core/` — configuration, thème, client HTTP, stockage
- `lib/features/` — une feature = `data` / `domain` / `presentation`
- `lib/router/` — GoRouter

## API backend (`/api/v1`)

L’URL de base inclut le préfixe global Nest `api/v1` :

| Variable `--dart-define` | Rôle |
|-------------------------|------|
| `API_BASE_URL`          | Ex. `http://localhost:3000/api/v1` ou `http://10.0.2.2:3000/api/v1` (émulateur Android → machine hôte). |
| `TENANT_ID`             | CUID du tenant : préremplit le champ « Tenant ID » à la connexion (pas de secret). |

Exemple :

```bash
flutter run --dart-define=API_BASE_URL=http://localhost:3000/api/v1 --dart-define=TENANT_ID=votre_cuid_tenant
```

### Test manuel (parcours login -> demande -> approbation)

#### Préconditions

1. Démarrer le backend Nest sur le port **3000** (préfixe global `api/v1` actif).
2. Disposer d’un utilisateur valide pour un tenant donné :
   - création de demande : permissions **`employee.read`** + **`leave.write`** ;
   - approbation : permission **`leave.approve`** (ex. rôle seed *owner*).
3. Récupérer un **`leaveTypeId`** valide (DB `LeaveType`, fixture locale, ou logs).  
   Limitation actuelle : pas de `GET /leave-types` public.

#### Lancement de l’app

```bash
cd mobile
flutter run \
  --dart-define=API_BASE_URL=http://localhost:3000/api/v1 \
  --dart-define=TENANT_ID=<tenant_cuid>
```

> Android emulator: utiliser `http://10.0.2.2:3000/api/v1`.

#### Scénario reproductible

1. Ouvrir l’app : le **splash** redirige automatiquement vers **connexion** (pas de session) ou **accueil** (session Hive existante).
2. Sur **Connexion**, saisir `tenantId`, email, mot de passe puis valider.
   - attendu : navigation vers **Accueil** ;
   - attendu : appels API avec headers `Authorization: Bearer <token>` et `x-tenant-id`.
3. Ouvrir **Nouvelle demande de congé**.
   - attendu : chargement de la liste via `GET /employees`.
4. Sélectionner un employé, saisir `leaveTypeId`, dates, motif (optionnel), puis envoyer.
   - attendu : succès `POST /leave-requests` et popup contenant `status` + `id`.
5. Copier l’`id`, ouvrir **Approbation** (visible si `leave.approve` présent dans le JWT), coller l’ID puis valider.
   - attendu : succès `POST /leave-requests/{id}/approve` avec popup de confirmation.

#### Vérification RFC7807 (title/detail)

Tester au moins 2 cas d’erreur (ex. mauvais mot de passe, tenant invalide, ID de demande inconnu) :

1. Provoquer une erreur backend retournant `application/problem+json`.
2. Vérifier le message affiché dans l’app :
   - priorité à `detail` ;
   - fallback sur `title` si `detail` est vide ;
   - si `title` et `detail` sont tous deux présents et différents, affichage combiné.

**Références utiles**

- Swagger OpenAPI : `http://localhost:3000/api/docs`
- Login : `POST http://localhost:3000/api/v1/auth/login`
- Employés : `GET http://localhost:3000/api/v1/employees`
- Congés : `POST http://localhost:3000/api/v1/leave-requests`, `POST http://localhost:3000/api/v1/leave-requests/{id}/approve`

### Limitations connues (backend tel que dans ce repo)

- Pas de **`GET /leave-requests`** : pas de liste des demandes dans l’app ; l’approbation repose sur un ID connu (création, DB, etc.).
- Pas de **`GET /leave-types`** : le **`leaveTypeId`** doit être fourni manuellement côté mobile pour ce MVP.
