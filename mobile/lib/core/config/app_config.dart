/// URL de base de l’API Nest (sans slash final). Surcharge possible via `--dart-define=API_BASE_URL=...`.
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    defaultValue: "http://localhost:3000/api/v1",
  );
}
