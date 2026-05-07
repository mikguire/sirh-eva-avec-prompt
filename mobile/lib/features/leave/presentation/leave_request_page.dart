import "package:dio/dio.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/network/problem_details.dart";
import "../../employees/data/employees_api.dart";
import "../../employees/employees_providers.dart";
import "../leave_providers.dart";

class LeaveRequestPage extends ConsumerStatefulWidget {
  const LeaveRequestPage({super.key});

  static const path = "/leave-request";

  @override
  ConsumerState<LeaveRequestPage> createState() => _LeaveRequestPageState();
}

class _LeaveRequestPageState extends ConsumerState<LeaveRequestPage> {
  final _leaveTypeId = TextEditingController();
  final _reason = TextEditingController();
  EmployeeRow? _employee;
  DateTime? _start;
  DateTime? _end;
  List<EmployeeRow>? _employees;
  Object? _loadErr;
  bool _loadingList = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  @override
  void dispose() {
    _leaveTypeId.dispose();
    _reason.dispose();
    super.dispose();
  }

  Future<void> _loadEmployees() async {
    if (!mounted) {
      return;
    }
    setState(() {
      _loadingList = true;
      _loadErr = null;
    });
    try {
      final rows = await ref.read(employeesApiProvider).list();
      if (!mounted) {
        return;
      }
      setState(() {
        _employees = rows;
        if (rows.isNotEmpty) {
          _employee ??= rows.first;
        }
      });
    } on DioException catch (e) {
      if (!mounted) {
        return;
      }
      setState(() => _loadErr = ProblemDetails.messageFromDio(e));
    } catch (e) {
      if (!mounted) {
        return;
      }
      setState(() => _loadErr = "$e");
    } finally {
      if (mounted) {
        setState(() => _loadingList = false);
      }
    }
  }

  String _dateIso(DateTime d) {
    final y = d.year.toString().padLeft(4, "0");
    final m = d.month.toString().padLeft(2, "0");
    final day = d.day.toString().padLeft(2, "0");
    return "$y-$m-$day";
  }

  Future<void> _pickStart() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _start ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) {
      setState(() => _start = picked);
    }
  }

  Future<void> _pickEnd() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _end ?? _start ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) {
      setState(() => _end = picked);
    }
  }

  Future<void> _submit() async {
    setState(() => _error = null);
    final emp = _employee;
    final lt = _leaveTypeId.text.trim();
    final start = _start;
    final end = _end;
    if (emp == null) {
      setState(() => _error = "Choisissez un employé.");
      return;
    }
    if (lt.isEmpty) {
      setState(() => _error = "Indiquez leaveTypeId (voir README — pas d’API liste types).");
      return;
    }
    if (start == null || end == null) {
      setState(() => _error = "Choisissez les dates de début et fin.");
      return;
    }
    setState(() => _submitting = true);
    try {
      final api = ref.read(leaveApiProvider);
      final row = await api.create(
        employeeId: emp.id,
        leaveTypeId: lt,
        startDateIso: _dateIso(start),
        endDateIso: _dateIso(end),
        reason: _reason.text.trim().isEmpty ? null : _reason.text.trim(),
      );
      if (!mounted) {
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text("Demande créée"),
          content: Text(
            "Statut : ${row.status}\nID (pour approbation) :\n${row.id}",
          ),
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
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Demande de congé")),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_loadingList)
                const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              else if (_loadErr != null)
                Card(
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(
                      "$_loadErr",
                      style: TextStyle(color: Theme.of(context).colorScheme.onErrorContainer),
                    ),
                  ),
                )
              else if ((_employees ?? []).isEmpty)
                Text(
                  "Aucun employé trouvé (permission employee.read ou données tenant).",
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                )
              else ...[
                DropdownButtonFormField<EmployeeRow>(
                  value: _employee,
                  decoration: const InputDecoration(labelText: "Employé (GET /employees)"),
                  items: (_employees ?? [])
                      .map(
                        (e) => DropdownMenuItem(value: e, child: Text(e.label, overflow: TextOverflow.ellipsis)),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _employee = v),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _leaveTypeId,
                  decoration: const InputDecoration(
                    labelText: "leaveTypeId",
                    helperText: "Identifiant Prisma — aucune route GET /leave-types pour l’instant",
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _pickStart,
                        child: Text(_start == null ? "Date début" : _dateIso(_start!)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _pickEnd,
                        child: Text(_end == null ? "Date fin" : _dateIso(_end!)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _reason,
                  decoration: const InputDecoration(labelText: "Motif (optionnel)"),
                  maxLines: 2,
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
                  onPressed: (_submitting || (_employees ?? []).isEmpty) ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text("Envoyer la demande"),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
