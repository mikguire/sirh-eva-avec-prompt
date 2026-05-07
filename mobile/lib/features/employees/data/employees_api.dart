import "package:dio/dio.dart";

class EmployeesApi {
  EmployeesApi(this._dio);

  final Dio _dio;

  Future<List<EmployeeRow>> list() async {
    final res = await _dio.get<List<dynamic>>("/employees");
    final list = res.data;
    if (list == null) {
      return [];
    }
    return list
        .map((e) => EmployeeRow.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();
  }
}

class EmployeeRow {
  EmployeeRow({
    required this.id,
    required this.workEmail,
    required this.firstName,
    required this.lastName,
  });

  final String id;
  final String workEmail;
  final String firstName;
  final String lastName;

  String get label => "$firstName $lastName ($workEmail)";

  factory EmployeeRow.fromJson(Map<String, dynamic> json) {
    return EmployeeRow(
      id: json["id"] as String,
      workEmail: json["workEmail"] as String,
      firstName: json["firstName"] as String,
      lastName: json["lastName"] as String,
    );
  }
}
