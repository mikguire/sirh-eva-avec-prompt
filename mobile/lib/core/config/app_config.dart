/// Configuration runtime via `--dart-define` (aucun secret en dur).
class AppConfig {
  AppConfig._();

  /// URL de base Nest **avec** préfixe `/api/v1` (sans slash final).
  static const String apiBaseUrl = String.fromEnvironment(
    "API_BASE_URL",
    defaultValue: "http://localhost:3000/api/v1",
  );

  /// Identifiant tenant CUID par défaut pour les écrans dev (saisie écrasable à la connexion).
  static const String defaultTenantId = String.fromEnvironment(
    "TENANT_ID",
    defaultValue: "",
  );
}
