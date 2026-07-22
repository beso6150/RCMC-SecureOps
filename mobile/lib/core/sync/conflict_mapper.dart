import 'package:rcmc_secureops/core/sync/offline_policy.dart';
import 'package:rcmc_secureops/core/sync/sync_queue_models.dart';

class SyncConflictResult {
  const SyncConflictResult({
    required this.status,
    required this.messageAr,
    required this.serverWins,
  });

  final SyncQueueStatus status;
  final String messageAr;
  final bool serverWins;
}

/// Maps HTTP / batch conflict responses to queue status + Arabic UI message.
class SyncConflictMapper {
  const SyncConflictMapper();

  SyncConflictResult map({
    int? statusCode,
    String? serverCode,
    String? serverMessage,
  }) {
    final isConflict =
        statusCode == 409 ||
        (serverCode?.toUpperCase().contains('CONFLICT') ?? false);

    if (isConflict) {
      return const SyncConflictResult(
        status: SyncQueueStatus.conflict,
        messageAr: OfflinePolicy.conflictMessageAr,
        serverWins: true,
      );
    }

    return SyncConflictResult(
      status: SyncQueueStatus.failed,
      messageAr: serverMessage?.trim().isNotEmpty == true
          ? serverMessage!.trim()
          : 'فشلت المزامنة',
      serverWins: false,
    );
  }
}
