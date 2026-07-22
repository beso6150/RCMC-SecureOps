import 'package:uuid/uuid.dart';

/// Generates stable Idempotency-Key values for mutating offline/online ops.
class IdempotencyKeyGenerator {
  IdempotencyKeyGenerator({Uuid? uuid}) : _uuid = uuid ?? const Uuid();

  final Uuid _uuid;

  /// Prefer an existing client key; otherwise mint a v4 UUID.
  String generate({String? existing}) {
    final trimmed = existing?.trim();
    if (trimmed != null && trimmed.isNotEmpty) return trimmed;
    return _uuid.v4();
  }

  /// Deterministic key for retries of the same local queue row.
  String forQueueItem({
    required String localId,
    required String operationType,
    required String entityType,
  }) {
    return '$operationType:$entityType:$localId';
  }
}
