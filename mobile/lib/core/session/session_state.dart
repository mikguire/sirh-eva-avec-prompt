class SessionState {
  const SessionState({
    this.accessToken,
    this.refreshToken,
    this.tenantId,
  });

  final String? accessToken;
  final String? refreshToken;
  final String? tenantId;

  bool get isAuthenticated =>
      accessToken != null && accessToken!.isNotEmpty && tenantId != null && tenantId!.isNotEmpty;
}
