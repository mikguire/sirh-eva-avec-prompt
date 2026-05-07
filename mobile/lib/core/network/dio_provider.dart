import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../config/app_config.dart";
import "../session/session_notifier.dart";

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {"Accept": "application/json"},
    ),
  );

  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        final session = ref.read(sessionNotifierProvider);
        final token = session.accessToken;
        if (token != null && token.isNotEmpty) {
          options.headers["Authorization"] = "Bearer $token";
        }
        final tenant = session.tenantId;
        if (tenant != null && tenant.isNotEmpty) {
          options.headers["x-tenant-id"] = tenant;
        }
        handler.next(options);
      },
    ),
  );

  ref.onDispose(() => dio.close(force: true));
  return dio;
});
