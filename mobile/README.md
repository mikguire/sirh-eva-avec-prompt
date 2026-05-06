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

## API backend

Configurer l’URL de base (fichier `lib/core/config/app_config.dart`) vers votre instance Nest (`/api/v1`).
