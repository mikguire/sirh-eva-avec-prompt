import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../core/network/jwt_payload.dart";
import "../../core/session/session_notifier.dart";
import "../auth/presentation/login_page.dart";
import "../leave/presentation/leave_approve_page.dart";
import "../leave/presentation/leave_request_page.dart";

class HomePage extends ConsumerWidget {
  const HomePage({super.key});

  static const path = "/home";
  static const name = "home";

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionNotifierProvider);
    final token = session.accessToken;
    final canApprove = JwtPayloadReader.hasPermission(token, "leave.approve");
    final role = JwtPayloadReader.role(token);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Tableau de bord"),
        actions: [
          IconButton(
            tooltip: "Déconnexion",
            onPressed: () async {
              await ref.read(sessionNotifierProvider.notifier).logout();
              if (context.mounted) {
                context.go(LoginPage.path);
              }
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            "Tenant : ${session.tenantId ?? "—"}",
            style: Theme.of(context).textTheme.titleSmall,
          ),
          if (role != null)
            Text(
              "Rôle JWT : $role",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          const Divider(height: 32),
          ListTile(
            leading: const Icon(Icons.edit_calendar_outlined),
            title: const Text("Nouvelle demande de congé"),
            subtitle: const Text("POST /leave-requests"),
            onTap: () => context.push(LeaveRequestPage.path),
          ),
          if (canApprove)
            ListTile(
              leading: const Icon(Icons.task_alt),
              title: const Text("Approbation"),
              subtitle: const Text("POST /leave-requests/{id}/approve"),
              onTap: () => context.push(LeaveApprovePage.path),
            ),
          if (!canApprove)
            ListTile(
              leading: Icon(Icons.lock_outline, color: Theme.of(context).disabledColor),
              title: const Text("Approbation"),
              subtitle: const Text(
                "Réservé aux comptes avec la permission leave.approve.",
              ),
              enabled: false,
            ),
        ],
      ),
    );
  }
}
