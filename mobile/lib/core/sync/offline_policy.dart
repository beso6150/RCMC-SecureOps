/// Offline allow / forbid policy for field operations.
class OfflinePolicy {
  OfflinePolicy._();

  static const Set<String> allowedQueueOperations = {
    'violation_create',
    'task_update',
    'patrol_visit',
    'message_send',
    'note_create',
    'referral_draft',
    'handover_draft',
    'photo_upload',
    'incident_create',
  };

  static const Set<String> forbiddenOfflineOperations = {
    'login',
    'password_change',
    'handover_final',
    'handover_submit',
    'handover_approve',
    'sos_claim_success',
    'critical_close',
  };

  static bool canQueue(String operationType) =>
      allowedQueueOperations.contains(operationType);

  static bool isForbiddenOffline(String operationType) =>
      forbiddenOfflineOperations.contains(operationType);

  /// SOS must never be marked as successfully sent while offline.
  static bool isSosBlockedOffline({required bool isOnline}) => !isOnline;

  static const String sosOfflineFailureAr =
      'تعذر إرسال نداء الاستغاثة — لا يوجد اتصال بالخادم. '
      'لن يتم تسجيل النداء كمرسل دون اتصال.';

  static const String conflictMessageAr =
      'حدث تعارض في البيانات. تم اعتماد نسخة الخادم.';
}
