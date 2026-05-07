import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../core/network/dio_provider.dart";
import "data/leave_api.dart";

final leaveApiProvider = Provider<LeaveApi>((ref) {
  return LeaveApi(ref.watch(dioProvider));
});
