import 'package:equatable/equatable.dart';

class AuthUser extends Equatable {
  const AuthUser({
    required this.id,
    required this.fullName,
    required this.nationalId,
    required this.employeeNumber,
    required this.email,
    required this.roleCode,
    required this.isFirstLogin,
    required this.status,
    this.phone,
    this.jobTitle,
    this.roleNameEn,
    this.roleNameAr,
    this.departmentId,
    this.departmentNameAr,
    this.shiftId,
    this.shiftNameAr,
    this.permissions = const [],
  });

  final String id;
  final String fullName;
  final String nationalId;
  final String employeeNumber;
  final String email;
  final String? phone;
  final String? jobTitle;
  final String roleCode;
  final String? roleNameEn;
  final String? roleNameAr;
  final String status;
  final bool isFirstLogin;
  final String? departmentId;
  final String? departmentNameAr;
  final String? shiftId;
  final String? shiftNameAr;
  final List<String> permissions;

  String get displayRole {
    if (roleNameAr != null && roleNameAr!.isNotEmpty) return roleNameAr!;
    return _roleArFallback[roleCode] ?? roleCode;
  }

  static const Map<String, String> _roleArFallback = {
    'SECURITY_GUARD': 'حارس أمن',
    'SECURITY_SUPERVISOR': 'مشرف أمن',
    'CCTV_OPERATOR': 'مشغل كاميرات',
    'OPERATIONS_MANAGER': 'مدير العمليات',
    'PROJECT_MANAGER': 'مدير المشروع',
    'SECURITY_DIRECTOR': 'المدير الأمني',
  };

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      fullName: json['fullName'] as String? ?? '',
      nationalId: json['nationalId'] as String? ?? '',
      employeeNumber: json['employeeNumber'] as String? ?? '',
      email: json['email'] as String? ?? '',
      phone: json['phone'] as String?,
      jobTitle: json['jobTitle'] as String?,
      roleCode: json['roleCode'] as String? ?? '',
      roleNameEn: json['roleNameEn'] as String?,
      roleNameAr: json['roleNameAr'] as String?,
      status: json['status'] as String? ?? '',
      isFirstLogin: json['isFirstLogin'] as bool? ?? false,
      departmentId: json['departmentId'] as String?,
      departmentNameAr: json['departmentNameAr'] as String?,
      shiftId: json['shiftId'] as String?,
      shiftNameAr: json['shiftNameAr'] as String?,
      permissions:
          (json['permissions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fullName': fullName,
    'nationalId': nationalId,
    'employeeNumber': employeeNumber,
    'email': email,
    'phone': phone,
    'jobTitle': jobTitle,
    'roleCode': roleCode,
    'roleNameEn': roleNameEn,
    'roleNameAr': roleNameAr,
    'status': status,
    'isFirstLogin': isFirstLogin,
    'departmentId': departmentId,
    'departmentNameAr': departmentNameAr,
    'shiftId': shiftId,
    'shiftNameAr': shiftNameAr,
    'permissions': permissions,
  };

  AuthUser copyWith({
    bool? isFirstLogin,
    String? shiftNameAr,
    String? departmentNameAr,
  }) {
    return AuthUser(
      id: id,
      fullName: fullName,
      nationalId: nationalId,
      employeeNumber: employeeNumber,
      email: email,
      phone: phone,
      jobTitle: jobTitle,
      roleCode: roleCode,
      roleNameEn: roleNameEn,
      roleNameAr: roleNameAr,
      status: status,
      isFirstLogin: isFirstLogin ?? this.isFirstLogin,
      departmentId: departmentId,
      departmentNameAr: departmentNameAr ?? this.departmentNameAr,
      shiftId: shiftId,
      shiftNameAr: shiftNameAr ?? this.shiftNameAr,
      permissions: permissions,
    );
  }

  @override
  List<Object?> get props => [id, employeeNumber, roleCode, isFirstLogin];
}

class AuthSession extends Equatable {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.mustChangePassword,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final bool mustChangePassword;
  final AuthUser user;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    final userJson = json['user'] as Map<String, dynamic>? ?? json;
    return AuthSession(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      mustChangePassword: json['mustChangePassword'] as bool? ?? false,
      user: AuthUser.fromJson(userJson),
    );
  }

  @override
  List<Object?> get props => [
    accessToken,
    refreshToken,
    mustChangePassword,
    user,
  ];
}
