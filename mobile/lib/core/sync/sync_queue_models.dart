/// Sync queue item status lifecycle.
enum SyncQueueStatus {
  pending,
  syncing,
  synced,
  failed,
  conflict,
  cancelled;

  String get apiValue {
    switch (this) {
      case SyncQueueStatus.pending:
        return 'PENDING';
      case SyncQueueStatus.syncing:
        return 'SYNCING';
      case SyncQueueStatus.synced:
        return 'SYNCED';
      case SyncQueueStatus.failed:
        return 'FAILED';
      case SyncQueueStatus.conflict:
        return 'CONFLICT';
      case SyncQueueStatus.cancelled:
        return 'CANCELLED';
    }
  }

  static SyncQueueStatus fromApi(String value) {
    switch (value.toUpperCase()) {
      case 'SYNCING':
        return SyncQueueStatus.syncing;
      case 'SYNCED':
        return SyncQueueStatus.synced;
      case 'FAILED':
        return SyncQueueStatus.failed;
      case 'CONFLICT':
        return SyncQueueStatus.conflict;
      case 'CANCELLED':
        return SyncQueueStatus.cancelled;
      case 'PENDING':
      default:
        return SyncQueueStatus.pending;
    }
  }

  String get labelAr {
    switch (this) {
      case SyncQueueStatus.pending:
        return 'بانتظار المزامنة';
      case SyncQueueStatus.syncing:
        return 'جاري المزامنة';
      case SyncQueueStatus.synced:
        return 'تمت المزامنة';
      case SyncQueueStatus.failed:
        return 'فشلت المزامنة';
      case SyncQueueStatus.conflict:
        return 'تعارض';
      case SyncQueueStatus.cancelled:
        return 'ملغاة';
    }
  }
}

/// Valid status transitions for the offline sync queue.
class SyncQueueTransitions {
  SyncQueueTransitions._();

  static const Map<SyncQueueStatus, Set<SyncQueueStatus>> allowed = {
    SyncQueueStatus.pending: {
      SyncQueueStatus.syncing,
      SyncQueueStatus.cancelled,
    },
    SyncQueueStatus.syncing: {
      SyncQueueStatus.synced,
      SyncQueueStatus.failed,
      SyncQueueStatus.conflict,
      SyncQueueStatus.pending,
    },
    SyncQueueStatus.failed: {
      SyncQueueStatus.pending,
      SyncQueueStatus.cancelled,
    },
    SyncQueueStatus.conflict: {
      SyncQueueStatus.cancelled,
      SyncQueueStatus.synced,
    },
    SyncQueueStatus.synced: {},
    SyncQueueStatus.cancelled: {},
  };

  static bool canTransition(SyncQueueStatus from, SyncQueueStatus to) {
    return allowed[from]?.contains(to) ?? false;
  }

  /// Applies [to] if allowed; otherwise returns [from] unchanged.
  static SyncQueueStatus transition(SyncQueueStatus from, SyncQueueStatus to) {
    if (canTransition(from, to)) return to;
    return from;
  }
}

class SyncQueueItem {
  const SyncQueueItem({
    required this.localId,
    required this.operationType,
    required this.entityType,
    required this.endpoint,
    required this.httpMethod,
    required this.payloadJson,
    required this.idempotencyKey,
    required this.status,
    required this.createdAt,
    this.localEntityId,
    this.serverEntityId,
    this.attachmentPathsJson = '[]',
    this.retryCount = 0,
    this.maxRetries = 5,
    this.lastAttemptAt,
    this.syncedAt,
    this.failureReason,
    this.dependencyLocalId,
  });

  final String localId;
  final String operationType;
  final String entityType;
  final String? localEntityId;
  final String? serverEntityId;
  final String endpoint;
  final String httpMethod;
  final String payloadJson;
  final String attachmentPathsJson;
  final String idempotencyKey;
  final SyncQueueStatus status;
  final int retryCount;
  final int maxRetries;
  final DateTime createdAt;
  final DateTime? lastAttemptAt;
  final DateTime? syncedAt;
  final String? failureReason;
  final String? dependencyLocalId;

  Map<String, Object?> toMap() => {
    'localId': localId,
    'operationType': operationType,
    'entityType': entityType,
    'localEntityId': localEntityId,
    'serverEntityId': serverEntityId,
    'endpoint': endpoint,
    'httpMethod': httpMethod,
    'payloadJson': payloadJson,
    'attachmentPathsJson': attachmentPathsJson,
    'idempotencyKey': idempotencyKey,
    'status': status.apiValue,
    'retryCount': retryCount,
    'maxRetries': maxRetries,
    'createdAt': createdAt.toIso8601String(),
    'lastAttemptAt': lastAttemptAt?.toIso8601String(),
    'syncedAt': syncedAt?.toIso8601String(),
    'failureReason': failureReason,
    'dependencyLocalId': dependencyLocalId,
  };

  factory SyncQueueItem.fromMap(Map<String, Object?> map) {
    return SyncQueueItem(
      localId: map['localId'] as String,
      operationType: map['operationType'] as String? ?? '',
      entityType: map['entityType'] as String? ?? '',
      localEntityId: map['localEntityId'] as String?,
      serverEntityId: map['serverEntityId'] as String?,
      endpoint: map['endpoint'] as String? ?? '',
      httpMethod: map['httpMethod'] as String? ?? 'POST',
      payloadJson: map['payloadJson'] as String? ?? '{}',
      attachmentPathsJson: map['attachmentPathsJson'] as String? ?? '[]',
      idempotencyKey: map['idempotencyKey'] as String? ?? '',
      status: SyncQueueStatus.fromApi(map['status'] as String? ?? 'PENDING'),
      retryCount: (map['retryCount'] as int?) ?? 0,
      maxRetries: (map['maxRetries'] as int?) ?? 5,
      createdAt:
          DateTime.tryParse(map['createdAt'] as String? ?? '') ??
          DateTime.now(),
      lastAttemptAt: map['lastAttemptAt'] != null
          ? DateTime.tryParse(map['lastAttemptAt'] as String)
          : null,
      syncedAt: map['syncedAt'] != null
          ? DateTime.tryParse(map['syncedAt'] as String)
          : null,
      failureReason: map['failureReason'] as String?,
      dependencyLocalId: map['dependencyLocalId'] as String?,
    );
  }

  SyncQueueItem copyWith({
    SyncQueueStatus? status,
    int? retryCount,
    DateTime? lastAttemptAt,
    DateTime? syncedAt,
    String? failureReason,
    String? serverEntityId,
  }) {
    return SyncQueueItem(
      localId: localId,
      operationType: operationType,
      entityType: entityType,
      localEntityId: localEntityId,
      serverEntityId: serverEntityId ?? this.serverEntityId,
      endpoint: endpoint,
      httpMethod: httpMethod,
      payloadJson: payloadJson,
      attachmentPathsJson: attachmentPathsJson,
      idempotencyKey: idempotencyKey,
      status: status ?? this.status,
      retryCount: retryCount ?? this.retryCount,
      maxRetries: maxRetries,
      createdAt: createdAt,
      lastAttemptAt: lastAttemptAt ?? this.lastAttemptAt,
      syncedAt: syncedAt ?? this.syncedAt,
      failureReason: failureReason ?? this.failureReason,
      dependencyLocalId: dependencyLocalId,
    );
  }
}
