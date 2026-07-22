/**
 * Mobile config defaults — timezone for clients: Asia/Riyadh
 */
export const MOBILE_SETTING_KEYS = {
  MIN_APP_VERSION: 'mobile.min_app_version',
  SUPPORTED_APP_VERSION: 'mobile.supported_app_version',
  MAX_IMAGE_MB: 'mobile.max_image_mb',
  MAX_DOCUMENT_MB: 'mobile.max_document_mb',
  OFFLINE_OPS_ALLOWLIST: 'mobile.offline_ops_allowlist',
  SYNC_INTERVAL_SECONDS: 'mobile.sync_interval_seconds',
  QR_REQUIRE_SERVER_VERIFY: 'mobile.qr_require_server_verify',
  LOCATION_REQUIRED_FOR_SOS: 'mobile.location_required_for_sos',
  SOS_TYPES: 'mobile.sos_types',
  QUIET_HOURS_ENABLED: 'mobile.quiet_hours_enabled',
  QUIET_HOURS_START: 'mobile.quiet_hours_start',
  QUIET_HOURS_END: 'mobile.quiet_hours_end',
  TIMEZONE: 'mobile.timezone',
} as const;

export const DEFAULT_OFFLINE_OPS_ALLOWLIST = [
  'TASK_ACCEPT',
  'TASK_START',
  'TASK_WAIT',
  'TASK_COMPLETE',
  'TASK_REJECT',
  'INCIDENT_ACK',
  'INCIDENT_ARRIVE',
  'INCIDENT_NOTE',
  'REFERRAL_RECEIVE',
  'REFERRAL_START',
  'REFERRAL_ARRIVE',
  'PERMIT_ACKNOWLEDGE',
  'CHECKPOINT_VISIT',
  'VIOLATION_CREATE',
  'MESSAGE_SEND',
  'SOS_CREATE',
] as const;

export const DEFAULT_SOS_TYPES = [
  { code: 'PERSONAL', labelAr: 'استغاثة شخصية', labelEn: 'Personal SOS' },
  { code: 'MEDICAL', labelAr: 'طارئ طبي', labelEn: 'Medical' },
  { code: 'SECURITY', labelAr: 'تهديد أمني', labelEn: 'Security threat' },
] as const;

export const MOBILE_SYSTEM_SETTINGS = [
  {
    key: MOBILE_SETTING_KEYS.MIN_APP_VERSION,
    value: '1.0.0',
    description: 'Minimum supported mobile app version (Asia/Riyadh)',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.SUPPORTED_APP_VERSION,
    value: '1.0.0',
    description: 'Recommended / supported mobile app version',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.MAX_IMAGE_MB,
    value: 15,
    description: 'Max image upload size in MB for mobile',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.MAX_DOCUMENT_MB,
    value: 25,
    description: 'Max document upload size in MB for mobile',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.OFFLINE_OPS_ALLOWLIST,
    value: [...DEFAULT_OFFLINE_OPS_ALLOWLIST],
    description: 'Offline sync operation types allowed in batch',
    isPublic: false,
  },
  {
    key: MOBILE_SETTING_KEYS.SYNC_INTERVAL_SECONDS,
    value: 180,
    description: 'Suggested mobile sync interval seconds (Asia/Riyadh)',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.QR_REQUIRE_SERVER_VERIFY,
    value: true,
    description: 'Require server verification for checkpoint QR scans',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.LOCATION_REQUIRED_FOR_SOS,
    value: false,
    description: 'Require map location when creating SOS from mobile',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.SOS_TYPES,
    value: [...DEFAULT_SOS_TYPES],
    description: 'SOS type catalog for mobile',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.QUIET_HOURS_ENABLED,
    value: false,
    description: 'Quiet hours for mobile notifications (disabled by default)',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.QUIET_HOURS_START,
    value: '22:00',
    description: 'Quiet hours start (Asia/Riyadh, HH:mm)',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.QUIET_HOURS_END,
    value: '06:00',
    description: 'Quiet hours end (Asia/Riyadh, HH:mm)',
    isPublic: true,
  },
  {
    key: MOBILE_SETTING_KEYS.TIMEZONE,
    value: 'Asia/Riyadh',
    description: 'Canonical mobile client timezone',
    isPublic: true,
  },
] as const;
