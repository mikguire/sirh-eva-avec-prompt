import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../config/app_config.dart";

/// Client HTTP partagé (interceptors auth / tenant à ajouter par feature).
final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {"Accept": "application/json"},
    ),
  );
  ref.onDispose(dio.close);
  return dio;
});
