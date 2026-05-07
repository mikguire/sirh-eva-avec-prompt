import "package:dio/dio.dart";

class LeaveApi {
  LeaveApi(this._dio);

  final Dio _dio;

  Future<LeaveRequestRow> create({
    required String employeeId,
    required String leaveTypeId,
    required String startDateIso,
    required String endDateIso,
    String? reason,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      "/leave-requests",
      data: {
        "employeeId": employeeId,
        "leaveTypeId": leaveTypeId,
        "startDate": startDateIso,
        "endDate": endDateIso,
        if (reason != null && reason.isNotEmpty) "reason": reason,
      },
    );
    final data = res.data;
    if (data == null) {
      throw DioException(
        requestOptions: res.requestOptions,
        response: res,
        message: "Réponse vide",
      );
    }
    return LeaveRequestRow.fromJson(data);
  }

  Future<LeaveRequestRow> approve(String leaveRequestId) async {
    final res = await _dio.post<Map<String, dynamic>>(
      "/leave-requests/$leaveRequestId/approve",
    );
    final data = res.data;
    if (data == null) {
      throw DioException(
        requestOptions: res.requestOptions,
        response: res,
        message: "Réponse vide",
      );
    }
    return LeaveRequestRow.fromJson(data);
  }
}

class LeaveRequestRow {
  LeaveRequestRow({
    required this.id,
    required this.status,
    required this.employeeId,
    required this.leaveTypeId,
  });

  final String id;
  final String status;
  final String employeeId;
  final String leaveTypeId;

  factory LeaveRequestRow.fromJson(Map<String, dynamic> json) {
    return LeaveRequestRow(
      id: json["id"] as String,
      status: json["status"] as String,
      employeeId: json["employeeId"] as String,
      leaveTypeId: json["leaveTypeId"] as String,
    );
  }
}
