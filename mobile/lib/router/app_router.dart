import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../core/session/session_notifier.dart";
import "../features/auth/presentation/login_page.dart";
import "../features/home/home_page.dart";
import "../features/leave/presentation/leave_approve_page.dart";
import "../features/leave/presentation/leave_request_page.dart";
import "../features/splash/splash_page.dart";

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ValueNotifier(0);
  ref.listen(sessionNotifierProvider, (_, __) {
    refresh.value++;
  });
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: SplashPage.path,
    refreshListenable: refresh,
    redirect: (context, state) {
      final session = ref.read(sessionNotifierProvider);
      final path = state.uri.path;
      if (path == SplashPage.path) {
        return null;
      }
      if (!session.isAuthenticated && path != LoginPage.path) {
        return LoginPage.path;
      }
      if (session.isAuthenticated && path == LoginPage.path) {
        return HomePage.path;
      }
      return null;
    },
    routes: [
      GoRoute(
        path: SplashPage.path,
        name: SplashPage.name,
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: LoginPage.path,
        name: LoginPage.name,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: HomePage.path,
        name: HomePage.name,
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: LeaveRequestPage.path,
        builder: (context, state) => const LeaveRequestPage(),
      ),
      GoRoute(
        path: LeaveApprovePage.path,
        builder: (context, state) => const LeaveApprovePage(),
      ),
    ],
  );
});
