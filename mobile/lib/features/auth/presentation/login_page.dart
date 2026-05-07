import "package:dio/dio.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../../core/config/app_config.dart";
import "../../../core/network/dio_provider.dart";
import "../../../core/network/problem_details.dart";
import "../../../core/session/session_notifier.dart";
import "../data/auth_api.dart";
import "../../home/home_page.dart";

final authApiProvider = Provider<AuthApi>((ref) => AuthApi(ref.watch(dioProvider)));

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  static const path = "/login";
  static const name = "login";

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _tenantId = TextEditingController(text: AppConfig.defaultTenantId);
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _tenantId.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    if (!(_formKey.currentState?.validate() ?? false)) {
      return;
    }
    final tenant = _tenantId.text.trim();
    if (tenant.isEmpty) {
      setState(() => _error = "L’identifiant tenant est obligatoire (header x-tenant-id).");
      return;
    }
    setState(() => _loading = true);
    try {
      final api = ref.read(authApiProvider);
      final res = await api.login(
        email: _email.text.trim(),
        password: _password.text,
        tenantId: tenant,
      );
      await ref.read(sessionNotifierProvider.notifier).setSession(
            accessToken: res.accessToken,
            refreshToken: res.refreshToken,
            tenantId: tenant,
          );
      if (!mounted) {
        return;
      }
      context.go(HomePage.path);
    } on DioException catch (e) {
      setState(() => _error = ProblemDetails.messageFromDio(e));
    } catch (e) {
      setState(() => _error = "$e");
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Connexion")),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _tenantId,
                  decoration: const InputDecoration(
                    labelText: "Tenant ID (x-tenant-id)",
                    hintText: "CUID du tenant — défini via --dart-define=TENANT_ID",
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? "Champ requis" : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autocorrect: false,
                  decoration: const InputDecoration(labelText: "E-mail"),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? "Champ requis" : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: "Mot de passe"),
                  validator: (v) {
                    if (v == null || v.length < 8) {
                      return "Au moins 8 caractères";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: Text(
                      _error!,
                      style: TextStyle(color: Theme.of(context).colorScheme.error),
                    ),
                  ),
                FilledButton(
                  onPressed: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text("Se connecter"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
