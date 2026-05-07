import "package:dio/dio.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/network/problem_details.dart";
import "../leave_providers.dart";

class LeaveApprovePage extends ConsumerStatefulWidget {
  const LeaveApprovePage({super.key});

  static const path = "/leave-approve";

  @override
  ConsumerState<LeaveApprovePage> createState() => _LeaveApprovePageState();
}

class _LeaveApprovePageState extends ConsumerState<LeaveApprovePage> {
  final _id = TextEditingController();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _id.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _error = null;
    });
    final trimmed = _id.text.trim();
    if (trimmed.isEmpty) {
      setState(() => _error = "Collez l’identifiant de la demande (retourné après création).");
      return;
    }
    setState(() => _loading = true);
    try {
      final row = await ref.read(leaveApiProvider).approve(trimmed);
      if (!mounted) {
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text("Demande mise à jour"),
          content: Text("Statut : ${row.status}\nID : ${row.id}"),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("OK")),
          ],
        ),
      );
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
      appBar: AppBar(title: const Text("Approbation")),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _id,
                decoration: const InputDecoration(
                  labelText: "ID demande de congé",
                  hintText: "cuid…",
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Il n’existe pas encore de liste des demandes côté API mobile ; utilisez l’ID affiché après création, ou une valeur connue (DB / Swagger / logs).",
                style: Theme.of(context).textTheme.bodySmall,
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
                    : const Text("Approuver"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
