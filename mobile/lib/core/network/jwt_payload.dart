import "dart:convert";

/// Lecture non vérifiante du payload JWT (usage UI uniquement : rôle / permissions).
class JwtPayloadReader {
  JwtPayloadReader._();

  static Map<String, dynamic>? decodePayload(String token) {
    try {
      final parts = token.split(".");
      if (parts.length != 3) {
        return null;
      }
      final normalized = base64Url.normalize(parts[1]);
      final jsonStr = utf8.decode(base64Url.decode(normalized));
      final map = jsonDecode(jsonStr);
      if (map is Map<String, dynamic>) {
        return map;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  static List<String> permissions(String? accessToken) {
    final payload = accessToken != null ? decodePayload(accessToken) : null;
    if (payload == null) {
      return [];
    }
    final raw = payload["permissions"];
    if (raw is List) {
      return raw.map((e) => "$e").toList();
    }
    return [];
  }

  static bool hasPermission(String? accessToken, String key) {
    return permissions(accessToken).contains(key);
  }

  static String? role(String? accessToken) {
    final payload = accessToken != null ? decodePayload(accessToken) : null;
    final r = payload?["role"];
    return r is String ? r : null;
  }
}
