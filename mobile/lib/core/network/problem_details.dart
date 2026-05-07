import "package:dio/dio.dart";

/// Réponse d’erreur RFC 7807 (`application/problem+json`) renvoyée par le backend Nest.
class ProblemDetails {
  ProblemDetails({
    required this.title,
    required this.detail,
    this.status,
    this.type,
    this.instance,
  });

  final String title;
  final String detail;
  final int? status;
  final String? type;
  final String? instance;

  /// Message utilisateur prioritaire.
  String get message {
    final d = detail.trim();
    final t = title.trim();
    if (d.isNotEmpty && t.isNotEmpty && d != t) {
      return "$t: $d";
    }
    if (d.isNotEmpty) {
      return d;
    }
    if (t.isNotEmpty) {
      return t;
    }
    return "Une erreur est survenue.";
  }

  static ProblemDetails? tryParse(DioException exception) {
    final response = exception.response;
    if (response == null) {
      return null;
    }
    final ct = response.headers.value("content-type") ?? "";
    final looksLikeProblem =
        ct.contains("application/problem+json") || ct.contains("application/problem");
    final data = response.data;
    if (!looksLikeProblem && data is! Map) {
      return null;
    }
    if (data is! Map) {
      return null;
    }
    final titleRaw = data["title"];
    final detailRaw = data["detail"];
    final hasProblemShape = looksLikeProblem ||
        data.containsKey("title") ||
        data.containsKey("detail") ||
        data.containsKey("instance");
    if (!hasProblemShape) {
      return null;
    }
    final statusValue = data["status"];
    final typeRaw = data["type"];
    final instanceRaw = data["instance"];
    return ProblemDetails(
      title: titleRaw != null ? "$titleRaw" : "Erreur",
      detail: detailRaw != null ? "$detailRaw" : "",
      status: statusValue is int ? statusValue : int.tryParse("$statusValue"),
      type: typeRaw != null ? "$typeRaw" : null,
      instance: instanceRaw != null ? "$instanceRaw" : null,
    );
  }

  static String messageFromDio(DioException exception) {
    final parsed = tryParse(exception);
    if (parsed != null) {
      return parsed.message;
    }
    final msg = exception.message?.trim();
    if (msg != null && msg.isNotEmpty) {
      return msg;
    }
    return "Erreur réseau ou serveur.";
  }
}
