import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

enum AppNotificationPriority {
  low,
  normal,
  high,
  critical;

  static AppNotificationPriority fromApi(String value) {
    switch (value) {
      case 'LOW':
        return AppNotificationPriority.low;
      case 'HIGH':
        return AppNotificationPriority.high;
      case 'CRITICAL':
        return AppNotificationPriority.critical;
      case 'NORMAL':
      default:
        return AppNotificationPriority.normal;
    }
  }

  String get apiValue {
    switch (this) {
      case AppNotificationPriority.low:
        return 'LOW';
      case AppNotificationPriority.normal:
        return 'NORMAL';
      case AppNotificationPriority.high:
        return 'HIGH';
      case AppNotificationPriority.critical:
        return 'CRITICAL';
    }
  }

  String get labelAr {
    switch (this) {
      case AppNotificationPriority.low:
        return 'منخفضة';
      case AppNotificationPriority.normal:
        return 'عادية';
      case AppNotificationPriority.high:
        return 'عالية';
      case AppNotificationPriority.critical:
        return 'حرجة';
    }
  }

  Color get color {
    switch (this) {
      case AppNotificationPriority.low:
        return const Color(0xFF43A047);
      case AppNotificationPriority.normal:
        return const Color(0xFF1E88E5);
      case AppNotificationPriority.high:
        return const Color(0xFFFB8C00);
      case AppNotificationPriority.critical:
        return const Color(0xFFE53935);
    }
  }
}

enum AppNotificationStatus {
  unread,
  read;

  static AppNotificationStatus fromApi(String value) {
    return value == 'READ'
        ? AppNotificationStatus.read
        : AppNotificationStatus.unread;
  }

  String get apiValue => this == AppNotificationStatus.read ? 'READ' : 'UNREAD';

  String get labelAr =>
      this == AppNotificationStatus.read ? 'مقروء' : 'غير مقروء';
}

class NotificationPerson extends Equatable {
  const NotificationPerson({
    required this.id,
    required this.fullName,
    this.employeeNumber,
  });

  final String id;
  final String fullName;
  final String? employeeNumber;

  factory NotificationPerson.fromJson(Map<String, dynamic>? json) {
    if (json == null) {
      return const NotificationPerson(id: '', fullName: 'النظام');
    }
    return NotificationPerson(
      id: json['id'] as String? ?? '',
      fullName: json['fullName'] as String? ?? 'النظام',
      employeeNumber: json['employeeNumber'] as String?,
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

class AppNotification extends Equatable {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.priority,
    required this.status,
    required this.createdAt,
    this.sender,
    this.entityType,
    this.entityId,
    this.readAt,
    this.channel,
    this.actionUrl,
    this.acknowledged = false,
  });

  final String id;
  final String title;
  final String body;
  final AppNotificationPriority priority;
  final AppNotificationStatus status;
  final DateTime createdAt;
  final NotificationPerson? sender;
  final String? entityType;
  final String? entityId;
  final DateTime? readAt;
  final String? channel;
  final String? actionUrl;
  final bool acknowledged;

  bool get isUnread => status == AppNotificationStatus.unread;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      body: json['body'] as String? ?? '',
      priority: AppNotificationPriority.fromApi(
        json['priority'] as String? ?? 'NORMAL',
      ),
      status: AppNotificationStatus.fromApi(
        json['status'] as String? ?? 'UNREAD',
      ),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      sender: json['sender'] is Map
          ? NotificationPerson.fromJson(
              Map<String, dynamic>.from(json['sender'] as Map),
            )
          : null,
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
      readAt: json['readAt'] != null
          ? DateTime.tryParse(json['readAt'] as String)
          : null,
      channel: json['channel'] as String?,
      actionUrl: json['actionUrl'] as String?,
      acknowledged: json['acknowledged'] == true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'body': body,
    'priority': priority.apiValue,
    'status': status.apiValue,
    'createdAt': createdAt.toIso8601String(),
    'sender': sender?.toJson(),
    'entityType': entityType,
    'entityId': entityId,
    'readAt': readAt?.toIso8601String(),
    'channel': channel,
    'actionUrl': actionUrl,
    'acknowledged': acknowledged,
  };

  AppNotification copyWith({
    AppNotificationStatus? status,
    DateTime? readAt,
    bool? acknowledged,
  }) {
    return AppNotification(
      id: id,
      title: title,
      body: body,
      priority: priority,
      status: status ?? this.status,
      createdAt: createdAt,
      sender: sender,
      entityType: entityType,
      entityId: entityId,
      readAt: readAt ?? this.readAt,
      channel: channel,
      actionUrl: actionUrl,
      acknowledged: acknowledged ?? this.acknowledged,
    );
  }

  @override
  List<Object?> get props => [id, status, title, acknowledged];
}

enum OpsTaskStatus {
  pending,
  inProgress,
  completed,
  overdue,
  cancelled;

  static OpsTaskStatus fromApi(String value) {
    switch (value) {
      case 'IN_PROGRESS':
        return OpsTaskStatus.inProgress;
      case 'COMPLETED':
        return OpsTaskStatus.completed;
      case 'OVERDUE':
        return OpsTaskStatus.overdue;
      case 'CANCELLED':
        return OpsTaskStatus.cancelled;
      case 'PENDING':
      default:
        return OpsTaskStatus.pending;
    }
  }

  String get apiValue {
    switch (this) {
      case OpsTaskStatus.pending:
        return 'PENDING';
      case OpsTaskStatus.inProgress:
        return 'IN_PROGRESS';
      case OpsTaskStatus.completed:
        return 'COMPLETED';
      case OpsTaskStatus.overdue:
        return 'OVERDUE';
      case OpsTaskStatus.cancelled:
        return 'CANCELLED';
    }
  }

  String get labelAr {
    switch (this) {
      case OpsTaskStatus.pending:
        return 'معلقة';
      case OpsTaskStatus.inProgress:
        return 'قيد التنفيذ';
      case OpsTaskStatus.completed:
        return 'مكتملة';
      case OpsTaskStatus.overdue:
        return 'متأخرة';
      case OpsTaskStatus.cancelled:
        return 'ملغاة';
    }
  }

  Color get color {
    switch (this) {
      case OpsTaskStatus.pending:
        return const Color(0xFFFB8C00);
      case OpsTaskStatus.inProgress:
        return const Color(0xFF1E88E5);
      case OpsTaskStatus.completed:
        return const Color(0xFF43A047);
      case OpsTaskStatus.overdue:
        return const Color(0xFFE53935);
      case OpsTaskStatus.cancelled:
        return const Color(0xFF757575);
    }
  }
}

enum OpsTaskPriority {
  low,
  normal,
  high,
  critical;

  static OpsTaskPriority fromApi(String value) {
    switch (value) {
      case 'LOW':
        return OpsTaskPriority.low;
      case 'HIGH':
        return OpsTaskPriority.high;
      case 'CRITICAL':
        return OpsTaskPriority.critical;
      case 'NORMAL':
      default:
        return OpsTaskPriority.normal;
    }
  }

  String get apiValue {
    switch (this) {
      case OpsTaskPriority.low:
        return 'LOW';
      case OpsTaskPriority.normal:
        return 'NORMAL';
      case OpsTaskPriority.high:
        return 'HIGH';
      case OpsTaskPriority.critical:
        return 'CRITICAL';
    }
  }

  String get labelAr {
    switch (this) {
      case OpsTaskPriority.low:
        return 'منخفضة';
      case OpsTaskPriority.normal:
        return 'عادية';
      case OpsTaskPriority.high:
        return 'عالية';
      case OpsTaskPriority.critical:
        return 'حرجة';
    }
  }
}

class OpsTask extends Equatable {
  const OpsTask({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    required this.createdAt,
    this.dueAt,
    this.completedAt,
    this.assignee,
    this.assigner,
    this.entityType,
    this.entityId,
  });

  final String id;
  final String title;
  final String description;
  final OpsTaskStatus status;
  final OpsTaskPriority priority;
  final DateTime createdAt;
  final DateTime? dueAt;
  final DateTime? completedAt;
  final NotificationPerson? assignee;
  final NotificationPerson? assigner;
  final String? entityType;
  final String? entityId;

  bool get isOverdue {
    if (status == OpsTaskStatus.completed ||
        status == OpsTaskStatus.cancelled) {
      return false;
    }
    if (status == OpsTaskStatus.overdue) return true;
    if (dueAt == null) return false;
    return dueAt!.isBefore(DateTime.now());
  }

  factory OpsTask.fromJson(Map<String, dynamic> json) {
    return OpsTask(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      status: OpsTaskStatus.fromApi(json['status'] as String? ?? 'PENDING'),
      priority: OpsTaskPriority.fromApi(
        json['priority'] as String? ?? 'NORMAL',
      ),
      createdAt:
          DateTime.tryParse(json['createdAt'] as String? ?? '') ??
          DateTime.now(),
      dueAt: json['dueAt'] != null
          ? DateTime.tryParse(json['dueAt'] as String)
          : null,
      completedAt: json['completedAt'] != null
          ? DateTime.tryParse(json['completedAt'] as String)
          : null,
      assignee: json['assignee'] is Map
          ? NotificationPerson.fromJson(
              Map<String, dynamic>.from(json['assignee'] as Map),
            )
          : null,
      assigner: json['assigner'] is Map
          ? NotificationPerson.fromJson(
              Map<String, dynamic>.from(json['assigner'] as Map),
            )
          : null,
      entityType: json['entityType'] as String?,
      entityId: json['entityId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'description': description,
    'status': status.apiValue,
    'priority': priority.apiValue,
    'createdAt': createdAt.toIso8601String(),
    'dueAt': dueAt?.toIso8601String(),
    'completedAt': completedAt?.toIso8601String(),
    'assignee': assignee?.toJson(),
    'assigner': assigner?.toJson(),
    'entityType': entityType,
    'entityId': entityId,
  };

  OpsTask copyWith({OpsTaskStatus? status, DateTime? completedAt}) {
    return OpsTask(
      id: id,
      title: title,
      description: description,
      status: status ?? this.status,
      priority: priority,
      createdAt: createdAt,
      dueAt: dueAt,
      completedAt: completedAt ?? this.completedAt,
      assignee: assignee,
      assigner: assigner,
      entityType: entityType,
      entityId: entityId,
    );
  }

  @override
  List<Object?> get props => [id, status, title];
}

class DashboardSummary extends Equatable {
  const DashboardSummary({
    this.todaysViolations = 0,
    this.todaysVisitors = 0,
    this.openIncidents = 0,
    this.unreadNotifications = 0,
    this.pendingTasks = 0,
    this.overdueTasks = 0,
    this.lastSyncAt,
    this.isConnected = false,
    this.syncHealthy = true,
  });

  final int todaysViolations;
  final int todaysVisitors;
  final int openIncidents;
  final int unreadNotifications;
  final int pendingTasks;
  final int overdueTasks;
  final DateTime? lastSyncAt;
  final bool isConnected;
  final bool syncHealthy;

  factory DashboardSummary.fromJson(
    Map<String, dynamic> json, {
    required bool isConnected,
    DateTime? cachedLastSync,
  }) {
    final hint = json['lastSyncHint'] as String?;
    return DashboardSummary(
      todaysViolations: (json['todaysViolations'] as num?)?.toInt() ?? 0,
      todaysVisitors: (json['todaysVisitors'] as num?)?.toInt() ?? 0,
      openIncidents: (json['openIncidents'] as num?)?.toInt() ?? 0,
      unreadNotifications: (json['unreadNotifications'] as num?)?.toInt() ?? 0,
      pendingTasks: (json['pendingTasks'] as num?)?.toInt() ?? 0,
      overdueTasks: (json['overdueTasks'] as num?)?.toInt() ?? 0,
      lastSyncAt: DateTime.tryParse(hint ?? '') ?? cachedLastSync,
      isConnected: isConnected,
      syncHealthy: isConnected,
    );
  }

  Map<String, dynamic> toJson() => {
    'todaysViolations': todaysViolations,
    'todaysVisitors': todaysVisitors,
    'openIncidents': openIncidents,
    'unreadNotifications': unreadNotifications,
    'pendingTasks': pendingTasks,
    'overdueTasks': overdueTasks,
    'lastSyncHint': lastSyncAt?.toIso8601String(),
  };

  DashboardSummary copyWith({
    int? todaysViolations,
    int? todaysVisitors,
    int? openIncidents,
    int? unreadNotifications,
    int? pendingTasks,
    int? overdueTasks,
    DateTime? lastSyncAt,
    bool? isConnected,
    bool? syncHealthy,
  }) {
    return DashboardSummary(
      todaysViolations: todaysViolations ?? this.todaysViolations,
      todaysVisitors: todaysVisitors ?? this.todaysVisitors,
      openIncidents: openIncidents ?? this.openIncidents,
      unreadNotifications: unreadNotifications ?? this.unreadNotifications,
      pendingTasks: pendingTasks ?? this.pendingTasks,
      overdueTasks: overdueTasks ?? this.overdueTasks,
      lastSyncAt: lastSyncAt ?? this.lastSyncAt,
      isConnected: isConnected ?? this.isConnected,
      syncHealthy: syncHealthy ?? this.syncHealthy,
    );
  }

  @override
  List<Object?> get props => [
    todaysViolations,
    todaysVisitors,
    openIncidents,
    unreadNotifications,
    pendingTasks,
    overdueTasks,
    isConnected,
  ];
}

class QuickActionItem {
  const QuickActionItem({
    required this.title,
    required this.icon,
    required this.route,
    this.enabled = true,
    this.permission,
  });

  final String title;
  final IconData icon;
  final String route;
  final bool enabled;
  final String? permission;
}
