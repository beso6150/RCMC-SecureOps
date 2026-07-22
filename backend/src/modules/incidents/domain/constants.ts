import {
  IncidentSeverity,
  IncidentStatus,
  IncidentHistoryAction,
  ParkingLocationCode,
} from '@prisma/client';

export const INCIDENT_STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  NEW: [
    'REPORTED',
    'ACKNOWLEDGED',
    'ASSIGNED',
    'IN_PROGRESS',
    'CANCELLED',
    'FALSE_ALARM',
    'ESCALATED',
  ],
  REPORTED: [
    'ACKNOWLEDGED',
    'ASSESSING',
    'ASSIGNED',
    'CANCELLED',
    'FALSE_ALARM',
    'ESCALATED',
  ],
  ACKNOWLEDGED: ['ASSESSING', 'ASSIGNED', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
  ASSESSING: ['ASSIGNED', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
  ASSIGNED: [
    'RESPONDING',
    'IN_PROGRESS',
    'ON_HOLD',
    'ON_SCENE',
    'CANCELLED',
    'FALSE_ALARM',
    'ESCALATED',
    'CLOSED',
  ],
  RESPONDING: ['ON_SCENE', 'ON_HOLD', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
  ON_SCENE: ['CONTAINED', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED', 'FALSE_ALARM', 'ESCALATED'],
  CONTAINED: ['RESOLVED', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED', 'ESCALATED'],
  IN_PROGRESS: [
    'ON_HOLD',
    'CONTAINED',
    'RESOLVED',
    'CLOSED',
    'CANCELLED',
    'ON_SCENE',
    'ESCALATED',
  ],
  ON_HOLD: [
    'IN_PROGRESS',
    'RESPONDING',
    'ON_SCENE',
    'CONTAINED',
    'ASSIGNED',
    'CLOSED',
    'CANCELLED',
  ],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  ESCALATED: [
    'ACKNOWLEDGED',
    'ASSESSING',
    'ASSIGNED',
    'RESPONDING',
    'IN_PROGRESS',
    'ON_SCENE',
  ],
  REOPENED: ['ASSESSING', 'ASSIGNED', 'IN_PROGRESS', 'RESPONDING'],
  CANCELLED: [],
  FALSE_ALARM: [],
};

export const SLA_HOURS_BY_SEVERITY: Record<IncidentSeverity, number> = {
  CRITICAL: 2,
  HIGH: 4,
  MEDIUM: 8,
  LOW: 24,
};

export const DEFAULT_INCIDENT_TYPES = [
  { code: 'CASE_PROOF', nameAr: 'إثبات حالة', nameEn: 'Case Proof', sortOrder: 10 },
  { code: 'SECURITY_REPORT', nameAr: 'بلاغ أمني', nameEn: 'Security Report', sortOrder: 20 },
  { code: 'SUPPORT_REQUEST', nameAr: 'طلب مؤازرة', nameEn: 'Support Request', sortOrder: 30 },
  { code: 'SAFETY_INCIDENT', nameAr: 'حادث سلامة', nameEn: 'Safety Incident', sortOrder: 40 },
  { code: 'EQUIPMENT_ENTRY', nameAr: 'دخول معدات', nameEn: 'Equipment Entry', sortOrder: 50 },
  { code: 'MEDICAL', nameAr: 'حالة طبية', nameEn: 'Medical Case', sortOrder: 60 },
  { code: 'SECURITY', nameAr: 'أمن', nameEn: 'Security', sortOrder: 70 },
  { code: 'FIRE', nameAr: 'حريق', nameEn: 'Fire', sortOrder: 80 },
  { code: 'EVACUATION', nameAr: 'إخلاء', nameEn: 'Evacuation', sortOrder: 90 },
  { code: 'SUSPICIOUS_PERSON', nameAr: 'شخص مشبوه', nameEn: 'Suspicious Person', sortOrder: 100 },
  {
    code: 'SUSPICIOUS_VEHICLE',
    nameAr: 'مركبة مشبوهة',
    nameEn: 'Suspicious Vehicle',
    sortOrder: 110,
  },
  {
    code: 'UNAUTHORIZED_ACCESS',
    nameAr: 'دخول غير مصرح',
    nameEn: 'Unauthorized Access',
    sortOrder: 120,
  },
  { code: 'CROWD_CONTROL', nameAr: 'ضبط حشود', nameEn: 'Crowd Control', sortOrder: 130 },
  { code: 'PROPERTY_DAMAGE', nameAr: 'أضرار ممتلكات', nameEn: 'Property Damage', sortOrder: 140 },
  { code: 'THEFT', nameAr: 'سرقة', nameEn: 'Theft', sortOrder: 150 },
  { code: 'LOST_ITEM', nameAr: 'مفقودات', nameEn: 'Lost Item', sortOrder: 160 },
  { code: 'SAFETY_HAZARD', nameAr: 'خطر سلامة', nameEn: 'Safety Hazard', sortOrder: 170 },
  { code: 'POWER_OUTAGE', nameAr: 'انقطاع كهرباء', nameEn: 'Power Outage', sortOrder: 180 },
  { code: 'WATER_LEAK', nameAr: 'تسرب مياه', nameEn: 'Water Leak', sortOrder: 190 },
  { code: 'ELEVATOR', nameAr: 'مصعد', nameEn: 'Elevator', sortOrder: 200 },
  { code: 'PARKING', nameAr: 'مواقف', nameEn: 'Parking', sortOrder: 210 },
  { code: 'VISITOR', nameAr: 'زائر', nameEn: 'Visitor', sortOrder: 220 },
  { code: 'OTHER', nameAr: 'أخرى', nameEn: 'Other', sortOrder: 900 },
] as const;

export const RESPONSE_METRIC = 'INCIDENT_TOTAL_RESPONSE';

/** Default escalation thresholds for operations room (seeded as system settings). */
export const DEFAULT_INCIDENT_ESCALATION_SETTINGS = {
  escalateUnackedMinutes: 5,
  escalateHighUnackedMinutes: 3,
  escalateNoResponseMinutes: 10,
  criticalNotifyDirector: true,
  criticalImmediateEscalate: true,
} as const;

export const INCIDENT_ESCALATION_SETTING_KEYS = {
  ESCALATE_UNACKED_MINUTES: 'incidents.escalate_unacked_minutes',
  ESCALATE_HIGH_UNACKED_MINUTES: 'incidents.escalate_high_unacked_minutes',
  ESCALATE_NO_RESPONSE_MINUTES: 'incidents.escalate_no_response_minutes',
  CRITICAL_NOTIFY_DIRECTOR: 'incidents.critical_notify_director',
  CRITICAL_IMMEDIATE_ESCALATE: 'incidents.critical_immediate_escalate',
} as const;

export const INCIDENT_ESCALATION_SYSTEM_SETTINGS = [
  {
    key: INCIDENT_ESCALATION_SETTING_KEYS.ESCALATE_UNACKED_MINUTES,
    value: DEFAULT_INCIDENT_ESCALATION_SETTINGS.escalateUnackedMinutes,
    description: 'Minutes before escalating unacknowledged incidents',
    isPublic: false,
  },
  {
    key: INCIDENT_ESCALATION_SETTING_KEYS.ESCALATE_HIGH_UNACKED_MINUTES,
    value: DEFAULT_INCIDENT_ESCALATION_SETTINGS.escalateHighUnackedMinutes,
    description: 'Minutes before escalating unacknowledged HIGH incidents',
    isPublic: false,
  },
  {
    key: INCIDENT_ESCALATION_SETTING_KEYS.ESCALATE_NO_RESPONSE_MINUTES,
    value: DEFAULT_INCIDENT_ESCALATION_SETTINGS.escalateNoResponseMinutes,
    description: 'Minutes after assign before escalating if response not started',
    isPublic: false,
  },
  {
    key: INCIDENT_ESCALATION_SETTING_KEYS.CRITICAL_NOTIFY_DIRECTOR,
    value: DEFAULT_INCIDENT_ESCALATION_SETTINGS.criticalNotifyDirector,
    description: 'Notify security director immediately for CRITICAL incidents',
    isPublic: false,
  },
  {
    key: INCIDENT_ESCALATION_SETTING_KEYS.CRITICAL_IMMEDIATE_ESCALATE,
    value: DEFAULT_INCIDENT_ESCALATION_SETTINGS.criticalImmediateEscalate,
    description: 'Escalate CRITICAL incidents immediately to operations room',
    isPublic: false,
  },
] as const;

/** Terminal / closed-like statuses that generally block edits. */
export const INCIDENT_TERMINAL_STATUSES: IncidentStatus[] = [
  IncidentStatus.CLOSED,
  IncidentStatus.CANCELLED,
  IncidentStatus.FALSE_ALARM,
];

export {
  IncidentSeverity,
  IncidentStatus,
  IncidentHistoryAction,
  ParkingLocationCode,
};
