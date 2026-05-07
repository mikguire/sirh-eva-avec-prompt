import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../core/session/session_notifier.dart";
import "../auth/presentation/login_page.dart";
import "../home/home_page.dart";

/// Amorçage : redirection selon session Hive (jetons + tenant).
class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  static const path = "/";
  static const name = "splash";

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = ref.read(sessionNotifierProvider);
      if (!mounted) {
        return;
      }
      if (session.isAuthenticated) {
        context.go(HomePage.path);
      } else {
        context.go(LoginPage.path);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text("SIRH EVA", style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
