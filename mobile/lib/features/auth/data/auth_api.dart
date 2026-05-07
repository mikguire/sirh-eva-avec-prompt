import "package:dio/dio.dart";

class AuthApi {
  AuthApi(this._dio);

  final Dio _dio;

  Future<LoginResponse> login({
    required String email,
    required String password,
    required String tenantId,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      "/auth/login",
      data: {
        "email": email,
        "password": password,
        "tenantId": tenantId,
      },
    );
    final data = res.data;
    if (data == null) {
      throw DioException(
        requestOptions: res.requestOptions,
        response: res,
        message: "Réponse vide du serveur",
      );
    }
    return LoginResponse.fromJson(data);
  }
}

class LoginResponse {
  LoginResponse({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      accessToken: json["accessToken"] as String,
      refreshToken: json["refreshToken"] as String,
    );
  }
}
