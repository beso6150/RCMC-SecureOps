import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

enum ViolationStatus {
  newStatus,
  assigned,
  inProgress,
  resolved,
  cancelled;

  static ViolationStatus fromApi(String value) {
    switch (value) {
      case 'ASSIGNED':
        return ViolationStatus.assigned;
      case 'IN_PROGRESS':
        return ViolationStatus.inProgress;
      case 'RESOLVED':
        return ViolationStatus.resolved;
      case 'CANCELLED':
        return ViolationStatus.cancelled;
      case 'NEW':
      default:
        return ViolationStatus.newStatus;
    }
  }

  String get apiValue {
    switch (this) {
      case ViolationStatus.newStatus:
        return 'NEW';
      case ViolationStatus.assigned:
        return 'ASSIGNED';
      case ViolationStatus.inProgress:
        return 'IN_PROGRESS';
      case ViolationStatus.resolved:
        return 'RESOLVED';
      case ViolationStatus.cancelled:
        return 'CANCELLED';
    }
  }

  String get labelAr {
    switch (this) {
      case ViolationStatus.newStatus:
        return 'جديدة';
      case ViolationStatus.assigned:
        return 'مُسندة';
      case ViolationStatus.inProgress:
        return 'قيد المعالجة';
      case ViolationStatus.resolved:
        return 'مغلقة';
      case ViolationStatus.cancelled:
        return 'ملغاة';
    }
  }

  Color get color {
    switch (this) {
      case ViolationStatus.newStatus:
        return const Color(0xFF1E88E5); // Blue
      case ViolationStatus.assigned:
        return const Color(0xFFFB8C00); // Orange
      case ViolationStatus.inProgress:
        return const Color(0xFF8E24AA); // Purple
      case ViolationStatus.resolved:
        return const Color(0xFF43A047); // Green
      case ViolationStatus.cancelled:
        return const Color(0xFFE53935); // Red
    }
  }
}

enum ParkingArea {
  ground,
  basement,
  west;

  static ParkingArea fromApi(String value) {
    switch (value) {
      case 'BASEMENT_PARKING':
        return ParkingArea.basement;
      case 'WEST_PARKING':
        return ParkingArea.west;
      case 'GROUND_PARKING':
      default:
        return ParkingArea.ground;
    }
  }

  String get apiValue {
    switch (this) {
      case ParkingArea.ground:
        return 'GROUND_PARKING';
      case ParkingArea.basement:
        return 'BASEMENT_PARKING';
      case ParkingArea.west:
        return 'WEST_PARKING';
    }
  }

  String get labelAr {
    switch (this) {
      case ParkingArea.ground:
        return 'المواقف الأرضية';
      case ParkingArea.basement:
        return 'البيسمنت';
      case ParkingArea.west:
        return 'المواقف الغربية';
    }
  }

  static const List<ParkingArea> all = ParkingArea.values;
}

enum ViolationType {
  illegalParking,
  noPermit,
  expiredPermit,
  blocking,
  unauthorizedZone,
  other;

  static ViolationType fromApi(String value) {
    switch (value) {
      case 'NO_PERMIT':
        return ViolationType.noPermit;
      case 'EXPIRED_PERMIT':
        return ViolationType.expiredPermit;
      case 'BLOCKING':
        return ViolationType.blocking;
      case 'UNAUTHORIZED_ZONE':
        return ViolationType.unauthorizedZone;
      case 'OTHER':
        return ViolationType.other;
      case 'ILLEGAL_PARKING':
      default:
        return ViolationType.illegalParking;
    }
  }

  String get apiValue {
    switch (this) {
      case ViolationType.illegalParking:
        return 'ILLEGAL_PARKING';
      case ViolationType.noPermit:
        return 'NO_PERMIT';
      case ViolationType.expiredPermit:
        return 'EXPIRED_PERMIT';
      case ViolationType.blocking:
        return 'BLOCKING';
      case ViolationType.unauthorizedZone:
        return 'UNAUTHORIZED_ZONE';
      case ViolationType.other:
        return 'OTHER';
    }
  }

  String get labelAr {
    switch (this) {
      case ViolationType.illegalParking:
        return 'وقوف مخالف';
      case ViolationType.noPermit:
        return 'بدون تصريح';
      case ViolationType.expiredPermit:
        return 'تصريح منتهي';
      case ViolationType.blocking:
        return 'إعاقة حركة';
      case ViolationType.unauthorizedZone:
        return 'منطقة غير مصرح بها';
      case ViolationType.other:
        return 'أخرى';
    }
  }

  static const List<ViolationType> all = ViolationType.values;
}

class ViolationAttachment extends Equatable {
  const ViolationAttachment({
    required this.id,
    required this.fileName,
    required this.storageKey,
    this.imagePath,
    this.localPath,
    this.mimeType = 'image/jpeg',
    this.fileSize = 0,
  });

  final String id;
  final String fileName;
  final String storageKey;
  final String? imagePath;
  final String? localPath;
  final String mimeType;
  final int fileSize;

  factory ViolationAttachment.fromJson(Map<String, dynamic> json) {
    return ViolationAttachment(
      id: json['id']?.toString() ?? '',
      fileName: json['fileName']?.toString() ?? 'image.jpg',
      storageKey: json['storageKey']?.toString() ?? '',
      imagePath: json['imagePath']?.toString(),
      localPath: json['localPath']?.toString(),
      mimeType: json['mimeType']?.toString() ?? 'image/jpeg',
      fileSize: (json['fileSize'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fileName': fileName,
    'storageKey': storageKey,
    'imagePath': imagePath,
    'localPath': localPath,
    'mimeType': mimeType,
    'fileSize': fileSize,
  };

  @override
  List<Object?> get props => [id, storageKey, localPath];
}

class ViolationPerson extends Equatable {
  const ViolationPerson({
    required this.id,
    required this.fullName,
    this.employeeNumber,
  });

  final String id;
  final String fullName;
  final String? employeeNumber;

  factory ViolationPerson.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const ViolationPerson(id: '', fullName: '—');
    }
    return ViolationPerson(
      id: json['id']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '—',
      employeeNumber: json['employeeNumber']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fullName': fullName,
    'employeeNumber': employeeNumber,
  };

  @override
  List<Object?> get props => [id, fullName];
}

class ViolationRecord extends Equatable {
  const ViolationRecord({
    required this.id,
    required this.plateNumber,
    required this.violationType,
    required this.parkingCode,
    required this.status,
    required this.createdAt,
    this.arabicPlate,
    this.englishPlate,
    this.ocrResult,
    this.ocrConfidence,
    this.vehicleColor,
    this.notes,
    this.imagePath,
    this.gpsLatitude,
    this.gpsLongitude,
    this.closedAt,
    this.clientSyncId,
    this.pendingSync = false,
    this.createdBy,
    this.supervisor,
    this.cctvOperator,
    this.attachments = const [],
    this.responseDurationMs,
    this.localOnly = false,
  });

  final String id;
  final String plateNumber;
  final String? arabicPlate;
  final String? englishPlate;
  final String? ocrResult;
  final double? ocrConfidence;
  final String? vehicleColor;
  final ViolationType violationType;
  final ParkingArea parkingCode;
  final ViolationStatus status;
  final String? notes;
  final String? imagePath;
  final double? gpsLatitude;
  final double? gpsLongitude;
  final DateTime createdAt;
  final DateTime? closedAt;
  final String? clientSyncId;
  final bool pendingSync;
  final bool localOnly;
  final ViolationPerson? createdBy;
  final ViolationPerson? supervisor;
  final ViolationPerson? cctvOperator;
  final List<ViolationAttachment> attachments;
  final int? responseDurationMs;

  String get assignedLabel {
    if (supervisor != null && supervisor!.fullName.isNotEmpty) {
      return 'مشرف: ${supervisor!.fullName}';
    }
    if (cctvOperator != null && cctvOperator!.fullName.isNotEmpty) {
      return 'كاميرات: ${cctvOperator!.fullName}';
    }
    return 'غير مُسند';
  }

  String? get responseTimeLabel {
    if (responseDurationMs == null) return null;
    final minutes = (responseDurationMs! / 60000).round();
    if (minutes < 1) return 'أقل من دقيقة';
    if (minutes < 60) return '$minutes دقيقة';
    final hours = (minutes / 60).floor();
    final rem = minutes % 60;
    return '$hours س $rem د';
  }

  factory ViolationRecord.fromJson(Map<String, dynamic> json) {
    final responseTimes = json['responseTimes'] as List<dynamic>?;
    int? duration;
    if (responseTimes != null) {
      for (final item in responseTimes) {
        if (item is Map && item['durationMs'] != null) {
          duration = (item['durationMs'] as num).toInt();
        }
      }
    }

    return ViolationRecord(
      id: json['id']?.toString() ?? json['clientSyncId']?.toString() ?? '',
      plateNumber: json['plateNumber']?.toString() ?? '',
      arabicPlate: json['arabicPlate']?.toString(),
      englishPlate: json['englishPlate']?.toString(),
      ocrResult: json['ocrResult']?.toString(),
      ocrConfidence: (json['ocrConfidence'] as num?)?.toDouble(),
      vehicleColor: json['vehicleColor']?.toString(),
      violationType: ViolationType.fromApi(
        json['violationType']?.toString() ?? '',
      ),
      parkingCode: ParkingArea.fromApi(json['parkingCode']?.toString() ?? ''),
      status: ViolationStatus.fromApi(json['status']?.toString() ?? 'NEW'),
      notes: json['notes']?.toString(),
      imagePath: json['imagePath']?.toString(),
      gpsLatitude: (json['gpsLatitude'] as num?)?.toDouble(),
      gpsLongitude: (json['gpsLongitude'] as num?)?.toDouble(),
      createdAt:
          DateTime.tryParse(json['createdAt']?.toString() ?? '') ??
          DateTime.now(),
      closedAt: DateTime.tryParse(json['closedAt']?.toString() ?? ''),
      clientSyncId: json['clientSyncId']?.toString(),
      pendingSync: json['pendingSync'] == true,
      localOnly: json['localOnly'] == true,
      createdBy: json['createdBy'] is Map
          ? ViolationPerson.fromJson(
              Map<String, dynamic>.from(json['createdBy'] as Map),
            )
          : null,
      supervisor: json['supervisor'] is Map
          ? ViolationPerson.fromJson(
              Map<String, dynamic>.from(json['supervisor'] as Map),
            )
          : null,
      cctvOperator: json['cctvOperator'] is Map
          ? ViolationPerson.fromJson(
              Map<String, dynamic>.from(json['cctvOperator'] as Map),
            )
          : null,
      attachments:
          (json['attachments'] as List<dynamic>?)
              ?.whereType<Map>()
              .map(
                (e) =>
                    ViolationAttachment.fromJson(Map<String, dynamic>.from(e)),
              )
              .toList() ??
          const [],
      responseDurationMs:
          duration ?? (json['responseDurationMs'] as num?)?.toInt(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'plateNumber': plateNumber,
    'arabicPlate': arabicPlate,
    'englishPlate': englishPlate,
    'ocrResult': ocrResult,
    'ocrConfidence': ocrConfidence,
    'vehicleColor': vehicleColor,
    'violationType': violationType.apiValue,
    'parkingCode': parkingCode.apiValue,
    'status': status.apiValue,
    'notes': notes,
    'imagePath': imagePath,
    'gpsLatitude': gpsLatitude,
    'gpsLongitude': gpsLongitude,
    'createdAt': createdAt.toIso8601String(),
    'closedAt': closedAt?.toIso8601String(),
    'clientSyncId': clientSyncId,
    'pendingSync': pendingSync,
    'localOnly': localOnly,
    'createdBy': createdBy?.toJson(),
    'supervisor': supervisor?.toJson(),
    'cctvOperator': cctvOperator?.toJson(),
    'attachments': attachments.map((e) => e.toJson()).toList(),
    'responseDurationMs': responseDurationMs,
  };

  Map<String, dynamic> toCreatePayload() => {
    'plateNumber': plateNumber,
    'arabicPlate': arabicPlate,
    'englishPlate': englishPlate,
    'ocrResult': ocrResult,
    'ocrConfidence': ocrConfidence,
    'vehicleColor': vehicleColor,
    'violationType': violationType.apiValue,
    'parkingCode': parkingCode.apiValue,
    'notes': notes,
    'imagePath': imagePath,
    'gpsLatitude': gpsLatitude,
    'gpsLongitude': gpsLongitude,
    'clientSyncId': clientSyncId,
    'detectedAt': createdAt.toIso8601String(),
    'autoAssign': true,
    'attachments': attachments
        .map(
          (a) => {
            'fileName': a.fileName,
            'mimeType': a.mimeType,
            'fileSize': a.fileSize,
            'storageKey': a.storageKey,
            'imagePath': a.imagePath ?? a.localPath,
          },
        )
        .toList(),
  };

  ViolationRecord copyWith({
    String? id,
    ViolationStatus? status,
    bool? pendingSync,
    bool? localOnly,
    String? plateNumber,
    String? arabicPlate,
    String? englishPlate,
    String? imagePath,
    List<ViolationAttachment>? attachments,
  }) {
    return ViolationRecord(
      id: id ?? this.id,
      plateNumber: plateNumber ?? this.plateNumber,
      arabicPlate: arabicPlate ?? this.arabicPlate,
      englishPlate: englishPlate ?? this.englishPlate,
      ocrResult: ocrResult,
      ocrConfidence: ocrConfidence,
      vehicleColor: vehicleColor,
      violationType: violationType,
      parkingCode: parkingCode,
      status: status ?? this.status,
      notes: notes,
      imagePath: imagePath ?? this.imagePath,
      gpsLatitude: gpsLatitude,
      gpsLongitude: gpsLongitude,
      createdAt: createdAt,
      closedAt: closedAt,
      clientSyncId: clientSyncId,
      pendingSync: pendingSync ?? this.pendingSync,
      localOnly: localOnly ?? this.localOnly,
      createdBy: createdBy,
      supervisor: supervisor,
      cctvOperator: cctvOperator,
      attachments: attachments ?? this.attachments,
      responseDurationMs: responseDurationMs,
    );
  }

  @override
  List<Object?> get props => [
    id,
    plateNumber,
    status,
    pendingSync,
    clientSyncId,
  ];
}

class CreateViolationDraft {
  CreateViolationDraft({
    required this.imageLocalPath,
    required this.capturedAt,
    required this.parkingCode,
    this.gpsLatitude,
    this.gpsLongitude,
    this.arabicPlate,
    this.englishPlate,
    this.ocrConfidence,
    this.ocrResult,
    this.plateNumber = '',
    this.vehicleColor,
    this.violationType = ViolationType.illegalParking,
    this.notes,
  });

  final String imageLocalPath;
  final DateTime capturedAt;
  final ParkingArea parkingCode;
  final double? gpsLatitude;
  final double? gpsLongitude;
  String? arabicPlate;
  String? englishPlate;
  double? ocrConfidence;
  String? ocrResult;
  String plateNumber;
  String? vehicleColor;
  ViolationType violationType;
  String? notes;
}

class OcrResult {
  const OcrResult({
    this.arabicPlate,
    this.englishPlate,
    this.confidence,
    this.rawText,
  });

  final String? arabicPlate;
  final String? englishPlate;
  final double? confidence;
  final String? rawText;
}
