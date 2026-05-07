import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:hive_flutter/hive_flutter.dart";

import "session_repository.dart";
import "session_state.dart";

final sessionRepositoryProvider = Provider<SessionRepository>((ref) {
  return SessionRepository(Hive.box(SessionRepository.boxName));
});

final sessionNotifierProvider =
    StateNotifierProvider<SessionNotifier, SessionState>((ref) {
  final repo = ref.watch(sessionRepositoryProvider);
  return SessionNotifier(repo);
});

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier(this._repository) : super(const SessionState()) {
    _hydrate();
  }

  final SessionRepository _repository;

  void _hydrate() {
    final snap = _repository.load();
    state = SessionState(
      accessToken: snap.accessToken,
      refreshToken: snap.refreshToken,
      tenantId: snap.tenantId,
    );
  }

  Future<void> setSession({
    required String accessToken,
    required String refreshToken,
    required String tenantId,
  }) async {
    await _repository.save(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tenantId: tenantId,
    );
    state = SessionState(
      accessToken: accessToken,
      refreshToken: refreshToken,
      tenantId: tenantId,
    );
  }

  Future<void> logout() async {
    await _repository.clear();
    state = const SessionState();
  }
}
