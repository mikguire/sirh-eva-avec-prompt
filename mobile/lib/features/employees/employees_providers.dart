import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../core/network/dio_provider.dart";
import "data/employees_api.dart";

final employeesApiProvider = Provider<EmployeesApi>((ref) {
  return EmployeesApi(ref.watch(dioProvider));
});
