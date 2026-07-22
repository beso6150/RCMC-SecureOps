import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';
import 'package:rcmc_secureops/models/violation.dart';

enum IncidentStatus {
  newStatus,
  assigned,
  inProgress,
  onHold,
  closed,
  cancelled;

  static IncidentStatus fromApi(String value) {
    switch (value) {
      case 'ASSIGNED':
        return IncidentStatus.assigned;
      case 'IN_PROGRESS':
        return IncidentStatus.inProgress;
      case 'ON_HOLD':
        return IncidentStatus.onHold;
      case 'CLOSED':
        return IncidentStatus.closed;
      case 'CANCELLED':
        return IncidentStatus.cancelled;
      case 'NEW':
      default:
        return IncidentStatus.newStatus;
    }
  }

  String get apiValue {
    switch (this) {
      case IncidentStatus.newStatus:
        return 'NEW';
      case IncidentStatus.assigned:
        return 'ASSIGNED';
      case IncidentStatus.inProgress:
        return 'IN_PROGRESS';
      case IncidentStatus.onHold:
        return 'ON_HOLD';
      case IncidentStatus.closed:
        return 'CLOSED';
      case IncidentStatus.cancelled:
        return 'CANCELLED';
    }
  }

  String get labelAr {
    switch (this) {
      case IncidentStatus.newStatus:
        return 'جديد';
      case IncidentStatus.assigned:
        return 'تم الإسناد';
      case IncidentStatus.inProgress:
        return 'قيد التنفيذ';
      case IncidentStatus.onHold:
        return 'معلق';
      case IncidentStatus.closed:
        return 'مغلق';
      case IncidentStatus.cancelled:
        return 'ملغي';
    }
  }

  Color get color {
    switch (this) {
      case IncidentStatus.newStatus:
        return const Color(0xFF1E88E5);
      case IncidentStatus.assigned:
        return const Color(0xFFFB8C00);
      case IncidentStatus.inProgress:
        return const Color(0xFF8E24AA);
      case IncidentStatus.onHold:
        return const Color(0xFF6D4C41);
      case IncidentStatus.closed:
        return const Color(0xFF43A047);
      case IncidentStatus.cancelled:
        return const Color(0xFFE53935);
    }
  }

  bool get isOpen =>
      this == IncidentStatus.newStatus ||
      this == IncidentStatus.assigned ||
      this == IncidentStatus.inProgress ||
      this == IncidentStatus.onHold;

  bool get isTerminal =>
      this == IncidentStatus.closed || this == IncidentStatus.cancelled;
}

enum IncidentPriority {
  low,
  medium,
  high,
  critical;

  static IncidentPriority fromApi(String value) {
    switch (value) {
      case 'LOW':
        return IncidentPriority.low;
      case 'HIGH':
        return IncidentPriority.high;
      case 'CRITICAL':
        return IncidentPriority.critical;
      case 'MEDIUM':
      default:
        return IncidentPriority.medium;
    }
  }

  String get apiValue {
    switch (this) {
      case IncidentPriority.low:
        return 'LOW';
      case IncidentPriority.medium:
        return 'MEDIUM';
      case IncidentPriority.high:
        return 'HIGH';
      case IncidentPriority.critical:
        return 'CRITICAL';
    }
  }

  String get labelAr {
    switch (this) {
      case IncidentPriority.low:
        return 'منخفضة';
      case IncidentPriority.medium:
        return 'متوسطة';
      case IncidentPriority.high:
        return 'عالية';
      case IncidentPriority.critical:
        return 'حرجة';
    }
  }

  Color get color {
    switch (this) {
      case IncidentPriority.low:
        return const Color(0xFF43A047);
      case IncidentPriority.medium:
        return const Color(0xFFFB8C00);
      case IncidentPriority.high:
        return const Color(0xFFE53935);
      case IncidentPriority.critical:
        return const Color(0xFF6A1B9A);
    }
  }

  static const List<IncidentPriority> all = IncidentPriority.values;
}

enum IncidentAttachmentKind { image, video, document, other }

class IncidentTypeOption extends Equatable {
  const IncidentTypeOption({
    required this.id,
    required this.code,
    required this.nameAr,
    this.nameEn,
    this.sortOrder = 100,
  });

  final String id;
  final String code;
  final String nameAr;
  final String? nameEn;
  final int sortOrder;

  bool get isCaseProof => code == 'CASE_PROOF';

  factory IncidentTypeOption.fromJson(Map<String, dynamic> json) {
    return IncidentTypeOption(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      nameAr: json['nameAr'] as String? ?? json['nameEn'] as String? ?? '',
      nameEn: json['nameEn'] as String?,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 100,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'code': code,
    'nameAr': nameAr,
    'nameEn': nameEn,
    'sortOrder': sortOrder,
  };

  @override
  List<Object?> get props => [id, code, nameAr];
}

class IncidentPerson extends Equatable {
  const IncidentPerson({
    required this.id,
    required this.fullName,
    this.employeeNumber,
  });

  final String id;
  final String fullName;
  final String? employeeNumber;

  factory IncidentPerson.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const IncidentPerson(id: '', fullName: '');
    }
    return IncidentPerson(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? '',
      employeeNumber: json['employeeNumber'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fullName': fullName,
    'employeeNumber': employeeNumber,
  };

  @override
  List<Object?> get props => [id, fullName, employeeNumber];
}

class IncidentAttachment extends Equatable {
  const IncidentAttachment({
    required this.id,
    required this.fileName,
    required this.storageKey,
    this.mimeType,
    this.fileSize = 0,
    this.localPath,
    this.kind = IncidentAttachmentKind.document,
  });

  final String id;
  final String fileName;
  final String storageKey;
  final String? mimeType;
  final int fileSize;
  final String? localPath;
  final IncidentAttachmentKind kind;

  factory IncidentAttachment.fromJson(Map<String, dynamic> json) {
    final mime = json['mimeType'] as String? ?? '';
    final type = (json['type'] as String? ?? '').toUpperCase();
    IncidentAttachmentKind kind = IncidentAttachmentKind.document;
    if (type == 'IMAGE' || mime.startsWith('image/')) {
      kind = IncidentAttachmentKind.image;
    } else if (type == 'VIDEO' || mime.startsWith('video/')) {
      kind = IncidentAttachmentKind.video;
    } else if (type == 'OTHER') {
      kind = IncidentAttachmentKind.other;
    }

    return IncidentAttachment(
      id: json['id'] as String? ?? '',
      fileName: json['fileName'] as String? ?? '',
      storageKey: json['storageKey'] as String? ?? '',
      mimeType: mime.isEmpty ? null : mime,
      fileSize: (json['fileSize'] as num?)?.toInt() ?? 0,
      localPath: json['localPath'] as String?,
      kind: kind,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fileName': fileName,
    'storageKey': storageKey,
    'mimeType': mimeType,
    'fileSize': fileSize,
    'localPath': localPath,
    'type': switch (kind) {
      IncidentAttachmentKind.image => 'IMAGE',
      IncidentAttachmentKind.video => 'VIDEO',
      IncidentAttachmentKind.other => 'OTHER',
      IncidentAttachmentKind.document => 'DOCUMENT',
    },
  };

  Map<String, dynamic> toApiPayload() => {
    'fileName': fileName,
    'mimeType': mimeType ?? 'application/octet-stream',
    'fileSize': fileSize > 0 ? fileSize : 1,
    'storageKey': storageKey,
    if (localPath != null) 'localPath': localPath,
  };

  @override
  List<Object?> get props => [id, fileName, storageKey, localPath];
}

class IncidentComment extends Equatable {
  const IncidentComment({
    required this.id,
    required this.body,
    required this.createdAt,
    this.author,
  });

  final String id;
  final String body;
  final DateTime createdAt;
  final IncidentPerson? author;

  factory IncidentComment.fromJson(Map<String, dynamic> json) {
    return IncidentComment(
      id: json['id'] as String? ?? '',
      body: json['body'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      author: json['author'] is Map
          ? IncidentPerson.fromJson(
              Map<String, dynamic>.from(json['author'] as Map),
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'body': body,
    'createdAt': createdAt.toIso8601String(),
    'author': author?.toJson(),
  };

  @override
  List<Object?> get props => [id, body, createdAt];
}

class IncidentHistoryEntry extends Equatable {
  const IncidentHistoryEntry({
    required this.id,
    required this.action,
    required this.createdAt,
    this.fromStatus,
    this.toStatus,
    this.notes,
    this.actor,
  });

  final String id;
  final String action;
  final DateTime createdAt;
  final IncidentStatus? fromStatus;
  final IncidentStatus? toStatus;
  final String? notes;
  final IncidentPerson? actor;

  String get actionLabelAr {
    switch (action) {
      case 'CREATED':
        return 'إنشاء البلاغ';
      case 'UPDATED':
        return 'تحديث';
      case 'ASSIGNED':
        return 'إسناد';
      case 'STATUS_CHANGED':
        return 'تغيير الحالة';
      case 'COMMENTED':
        return 'تعليق';
      case 'ATTACHMENT_ADDED':
        return 'مرفق جديد';
      case 'CLOSED':
        return 'إغلاق';
      case 'CANCELLED':
        return 'إلغاء';
      case 'PDF_GENERATED':
        return 'توليد PDF';
      default:
        return action;
    }
  }

  factory IncidentHistoryEntry.fromJson(Map<String, dynamic> json) {
    return IncidentHistoryEntry(
      id: json['id'] as String? ?? '',
      action: json['action'] as String? ?? '',
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      fromStatus: json['fromStatus'] != null
          ? IncidentStatus.fromApi(json['fromStatus'] as String)
          : null,
      toStatus: json['toStatus'] != null
          ? IncidentStatus.fromApi(json['toStatus'] as String)
          : null,
      notes: json['notes'] as String?,
      actor: json['actor'] is Map
          ? IncidentPerson.fromJson(
              Map<String, dynamic>.from(json['actor'] as Map),
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'action': action,
    'createdAt': createdAt.toIso8601String(),
    'fromStatus': fromStatus?.apiValue,
    'toStatus': toStatus?.apiValue,
    'notes': notes,
    'actor': actor?.toJson(),
  };

  @override
  List<Object?> get props => [id, action, createdAt];
}

class FacilityFloor extends Equatable {
  const FacilityFloor({
    required this.id,
    required this.code,
    required this.nameAr,
  });

  final String id;
  final String code;
  final String nameAr;

  factory FacilityFloor.fromJson(Map<String, dynamic> json) {
    return FacilityFloor(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      nameAr: json['nameAr'] as String? ?? json['nameEn'] as String? ?? '',
    );
  }

  @override
  List<Object?> get props => [id, code];
}

class FacilityMeetingRoom extends Equatable {
  const FacilityMeetingRoom({
    required this.id,
    required this.code,
    required this.nameAr,
    this.floorId,
  });

  final String id;
  final String code;
  final String nameAr;
  final String? floorId;

  factory FacilityMeetingRoom.fromJson(Map<String, dynamic> json) {
    return FacilityMeetingRoom(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      nameAr: json['nameAr'] as String? ?? json['nameEn'] as String? ?? '',
      floorId: json['floorId'] as String?,
    );
  }

  @override
  List<Object?> get props => [id, code, floorId];
}

class IncidentRecord extends Equatable {
  const IncidentRecord({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.occurredAt,
    required this.createdAt,
    this.typeId,
    this.typeCode,
    this.typeNameAr,
    this.notes,
    this.parkingCode,
    this.floorId,
    this.floorNameAr,
    this.meetingRoomId,
    this.meetingRoomNameAr,
    this.shiftId,
    this.shiftNameAr,
    this.gpsLatitude,
    this.gpsLongitude,
    this.startedAt,
    this.closedAt,
    this.slaDueAt,
    this.durationMs,
    this.pdfPath,
    this.pdfUrl,
    this.clientSyncId,
    this.pendingSync = false,
    this.localOnly = false,
    this.reporter,
    this.assignee,
    this.supervisor,
    this.opsManager,
    this.attachments = const [],
    this.comments = const [],
    this.history = const [],
    this.responseDurationMs,
  });

  final String id;
  final String title;
  final String description;
  final String? notes;
  final IncidentStatus status;
  final IncidentPriority priority;
  final String? typeId;
  final String? typeCode;
  final String? typeNameAr;
  final ParkingArea? parkingCode;
  final String? floorId;
  final String? floorNameAr;
  final String? meetingRoomId;
  final String? meetingRoomNameAr;
  final String? shiftId;
  final String? shiftNameAr;
  final double? gpsLatitude;
  final double? gpsLongitude;
  final DateTime occurredAt;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? closedAt;
  final DateTime? slaDueAt;
  final int? durationMs;
  final String? pdfPath;
  final String? pdfUrl;
  final String? clientSyncId;
  final bool pendingSync;
  final bool localOnly;
  final IncidentPerson? reporter;
  final IncidentPerson? assignee;
  final IncidentPerson? supervisor;
  final IncidentPerson? opsManager;
  final List<IncidentAttachment> attachments;
  final List<IncidentComment> comments;
  final List<IncidentHistoryEntry> history;
  final int? responseDurationMs;

  String get typeLabelAr => typeNameAr ?? typeCode ?? 'بلاغ';

  String? get durationLabelAr {
    final ms = durationMs ?? responseDurationMs;
    if (ms == null) return null;
    final totalMinutes = (ms / 60000).round();
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (hours > 0) return '$hours س $minutes د';
    return '$minutes دقيقة';
  }

  bool get isSlaBreached {
    if (slaDueAt == null) return false;
    final end = closedAt ?? DateTime.now();
    return end.isAfter(slaDueAt!);
  }

  factory IncidentRecord.fromJson(Map<String, dynamic> json) {
    final type = json['type'] is Map
        ? Map<String, dynamic>.from(json['type'] as Map)
        : null;
    final floor = json['floor'] is Map
        ? Map<String, dynamic>.from(json['floor'] as Map)
        : null;
    final room = json['meetingRoom'] is Map
        ? Map<String, dynamic>.from(json['meetingRoom'] as Map)
        : null;
    final shift = json['shift'] is Map
        ? Map<String, dynamic>.from(json['shift'] as Map)
        : null;

    final responseTimes = json['responseTimes'] as List<dynamic>? ?? const [];
    int? responseMs;
    for (final raw in responseTimes) {
      if (raw is Map && raw['durationMs'] != null) {
        responseMs = (raw['durationMs'] as num).toInt();
        break;
      }
    }

    return IncidentRecord(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      notes: json['notes'] as String?,
      status: IncidentStatus.fromApi(json['status'] as String? ?? 'NEW'),
      priority: IncidentPriority.fromApi(
        json['severity'] as String? ?? 'MEDIUM',
      ),
      typeId: json['typeId'] as String? ?? type?['id'] as String?,
      typeCode: json['typeCode'] as String? ?? type?['code'] as String?,
      typeNameAr: json['typeNameAr'] as String? ?? type?['nameAr'] as String?,
      parkingCode: json['parkingCode'] != null
          ? ParkingArea.fromApi(json['parkingCode'] as String)
          : null,
      floorId: json['floorId'] as String? ?? floor?['id'] as String?,
      floorNameAr:
          json['floorNameAr'] as String? ?? floor?['nameAr'] as String?,
      meetingRoomId: json['meetingRoomId'] as String? ?? room?['id'] as String?,
      meetingRoomNameAr:
          json['meetingRoomNameAr'] as String? ?? room?['nameAr'] as String?,
      shiftId: json['shiftId'] as String? ?? shift?['id'] as String?,
      shiftNameAr:
          json['shiftNameAr'] as String? ?? shift?['nameAr'] as String?,
      gpsLatitude: (json['gpsLatitude'] as num?)?.toDouble(),
      gpsLongitude: (json['gpsLongitude'] as num?)?.toDouble(),
      occurredAt:
          DateTime.tryParse(json['occurredAt'] as String? ?? '') ??
          DateTime.now(),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      startedAt: json['startedAt'] != null
          ? DateTime.tryParse(json['startedAt'] as String)
          : null,
      closedAt: json['closedAt'] != null
          ? DateTime.tryParse(json['closedAt'] as String)
          : null,
      slaDueAt: json['slaDueAt'] != null
          ? DateTime.tryParse(json['slaDueAt'] as String)
          : null,
      durationMs: (json['durationMs'] as num?)?.toInt(),
      pdfPath: json['pdfPath'] as String?,
      pdfUrl: json['pdfUrl'] as String?,
      clientSyncId: json['clientSyncId'] as String?,
      pendingSync: json['pendingSync'] as bool? ?? false,
      localOnly: json['localOnly'] as bool? ?? false,
      reporter: json['reporter'] is Map
          ? IncidentPerson.fromJson(
              Map<String, dynamic>.from(json['reporter'] as Map),
            )
          : null,
      assignee: json['assignee'] is Map
          ? IncidentPerson.fromJson(
              Map<String, dynamic>.from(json['assignee'] as Map),
            )
          : null,
      supervisor: json['supervisor'] is Map
          ? IncidentPerson.fromJson(
              Map<String, dynamic>.from(json['supervisor'] as Map),
            )
          : null,
      opsManager: json['opsManager'] is Map
          ? IncidentPerson.fromJson(
              Map<String, dynamic>.from(json['opsManager'] as Map),
            )
          : null,
      attachments: (json['attachments'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => IncidentAttachment.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      comments: (json['comments'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map((e) => IncidentComment.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      history: (json['history'] as List<dynamic>? ?? const [])
          .whereType<Map>()
          .map(
            (e) => IncidentHistoryEntry.fromJson(Map<String, dynamic>.from(e)),
          )
          .toList(),
      responseDurationMs: responseMs,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'notes': notes,
    'status': status.apiValue,
    'severity': priority.apiValue,
    'typeId': typeId,
    'typeCode': typeCode,
    'typeNameAr': typeNameAr,
    'parkingCode': parkingCode?.apiValue,
    'floorId': floorId,
    'floorNameAr': floorNameAr,
    'meetingRoomId': meetingRoomId,
    'meetingRoomNameAr': meetingRoomNameAr,
    'shiftId': shiftId,
    'shiftNameAr': shiftNameAr,
    'gpsLatitude': gpsLatitude,
    'gpsLongitude': gpsLongitude,
    'occurredAt': occurredAt.toIso8601String(),
    'createdAt': createdAt.toIso8601String(),
    'startedAt': startedAt?.toIso8601String(),
    'closedAt': closedAt?.toIso8601String(),
    'slaDueAt': slaDueAt?.toIso8601String(),
    'durationMs': durationMs,
    'pdfPath': pdfPath,
    'pdfUrl': pdfUrl,
    'clientSyncId': clientSyncId,
    'pendingSync': pendingSync,
    'localOnly': localOnly,
    'reporter': reporter?.toJson(),
    'assignee': assignee?.toJson(),
    'supervisor': supervisor?.toJson(),
    'opsManager': opsManager?.toJson(),
    'attachments': attachments.map((e) => e.toJson()).toList(),
    'comments': comments.map((e) => e.toJson()).toList(),
    'history': history.map((e) => e.toJson()).toList(),
    'responseDurationMs': responseDurationMs,
  };

  Map<String, dynamic> toCreatePayload() => {
    if (typeId != null) 'typeId': typeId,
    if (typeCode != null) 'typeCode': typeCode,
    'title': title,
    'description': description,
    if (notes != null) 'notes': notes,
    'severity': priority.apiValue,
    if (parkingCode != null) 'parkingCode': parkingCode!.apiValue,
    if (floorId != null) 'floorId': floorId,
    if (meetingRoomId != null) 'meetingRoomId': meetingRoomId,
    if (shiftId != null) 'shiftId': shiftId,
    if (gpsLatitude != null) 'gpsLatitude': gpsLatitude,
    if (gpsLongitude != null) 'gpsLongitude': gpsLongitude,
    'occurredAt': occurredAt.toIso8601String(),
    if (clientSyncId != null) 'clientSyncId': clientSyncId,
    'autoAssign': true,
    if (attachments.isNotEmpty)
      'attachments': attachments.map((e) => e.toApiPayload()).toList(),
  };

  IncidentRecord copyWith({
    String? id,
    String? title,
    String? description,
    String? notes,
    IncidentStatus? status,
    IncidentPriority? priority,
    String? typeId,
    String? typeCode,
    String? typeNameAr,
    ParkingArea? parkingCode,
    String? floorId,
    String? floorNameAr,
    String? meetingRoomId,
    String? meetingRoomNameAr,
    String? shiftId,
    String? shiftNameAr,
    double? gpsLatitude,
    double? gpsLongitude,
    DateTime? occurredAt,
    DateTime? createdAt,
    DateTime? startedAt,
    DateTime? closedAt,
    DateTime? slaDueAt,
    int? durationMs,
    String? pdfPath,
    String? pdfUrl,
    String? clientSyncId,
    bool? pendingSync,
    bool? localOnly,
    IncidentPerson? reporter,
    IncidentPerson? assignee,
    IncidentPerson? supervisor,
    IncidentPerson? opsManager,
    List<IncidentAttachment>? attachments,
    List<IncidentComment>? comments,
    List<IncidentHistoryEntry>? history,
    int? responseDurationMs,
  }) {
    return IncidentRecord(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      notes: notes ?? this.notes,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      typeId: typeId ?? this.typeId,
      typeCode: typeCode ?? this.typeCode,
      typeNameAr: typeNameAr ?? this.typeNameAr,
      parkingCode: parkingCode ?? this.parkingCode,
      floorId: floorId ?? this.floorId,
      floorNameAr: floorNameAr ?? this.floorNameAr,
      meetingRoomId: meetingRoomId ?? this.meetingRoomId,
      meetingRoomNameAr: meetingRoomNameAr ?? this.meetingRoomNameAr,
      shiftId: shiftId ?? this.shiftId,
      shiftNameAr: shiftNameAr ?? this.shiftNameAr,
      gpsLatitude: gpsLatitude ?? this.gpsLatitude,
      gpsLongitude: gpsLongitude ?? this.gpsLongitude,
      occurredAt: occurredAt ?? this.occurredAt,
      createdAt: createdAt ?? this.createdAt,
      startedAt: startedAt ?? this.startedAt,
      closedAt: closedAt ?? this.closedAt,
      slaDueAt: slaDueAt ?? this.slaDueAt,
      durationMs: durationMs ?? this.durationMs,
      pdfPath: pdfPath ?? this.pdfPath,
      pdfUrl: pdfUrl ?? this.pdfUrl,
      clientSyncId: clientSyncId ?? this.clientSyncId,
      pendingSync: pendingSync ?? this.pendingSync,
      localOnly: localOnly ?? this.localOnly,
      reporter: reporter ?? this.reporter,
      assignee: assignee ?? this.assignee,
      supervisor: supervisor ?? this.supervisor,
      opsManager: opsManager ?? this.opsManager,
      attachments: attachments ?? this.attachments,
      comments: comments ?? this.comments,
      history: history ?? this.history,
      responseDurationMs: responseDurationMs ?? this.responseDurationMs,
    );
  }

  @override
  List<Object?> get props => [
    id,
    clientSyncId,
    status,
    pendingSync,
    updatedKey,
  ];

  String get updatedKey => '${closedAt?.millisecondsSinceEpoch}-$title';
}

class CreateIncidentDraft {
  CreateIncidentDraft({
    this.typeId,
    this.typeCode,
    this.typeNameAr,
    this.title = '',
    this.description = '',
    this.notes,
    this.priority = IncidentPriority.medium,
    this.parkingCode,
    this.floorId,
    this.floorNameAr,
    this.meetingRoomId,
    this.meetingRoomNameAr,
    this.shiftId,
    this.shiftNameAr,
    this.gpsLatitude,
    this.gpsLongitude,
    DateTime? occurredAt,
    this.attachments = const [],
    this.reporterName,
  }) : occurredAt = occurredAt ?? DateTime.now();

  String? typeId;
  String? typeCode;
  String? typeNameAr;
  String title;
  String description;
  String? notes;
  IncidentPriority priority;
  ParkingArea? parkingCode;
  String? floorId;
  String? floorNameAr;
  String? meetingRoomId;
  String? meetingRoomNameAr;
  String? shiftId;
  String? shiftNameAr;
  double? gpsLatitude;
  double? gpsLongitude;
  DateTime occurredAt;
  List<IncidentAttachment> attachments;
  String? reporterName;
}
