import "package:hive_flutter/hive_flutter.dart";

class SessionRepository {
  SessionRepository(this._box);

  static const boxName = "eva_session";

  static const _keyAccess = "accessToken";
  static const _keyRefresh = "refreshToken";
  static const _keyTenant = "tenantId";

  final Box<dynamic> _box;

  SessionSnapshot load() {
    return SessionSnapshot(
      accessToken: _box.get(_keyAccess) as String?,
      refreshToken: _box.get(_keyRefresh) as String?,
      tenantId: _box.get(_keyTenant) as String?,
    );
  }

  Future<void> save({
    required String accessToken,
    required String refreshToken,
    required String tenantId,
  }) async {
    await _box.put(_keyAccess, accessToken);
    await _box.put(_keyRefresh, refreshToken);
    await _box.put(_keyTenant, tenantId);
  }

  Future<void> clear() async {
    await _box.delete(_keyAccess);
    await _box.delete(_keyRefresh);
    await _box.delete(_keyTenant);
  }
}

class SessionSnapshot {
  SessionSnapshot({
    required this.accessToken,
    required this.refreshToken,
    required this.tenantId,
  });

  final String? accessToken;
  final String? refreshToken;
  final String? tenantId;
}
