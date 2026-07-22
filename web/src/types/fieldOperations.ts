import type { UserRef } from './cctv';

export type SecurityZoneType =
  | 'BUILDING'
  | 'FLOOR'
  | 'HALL'
  | 'OFFICE'
  | 'PARKING'
  | 'ENTRANCE'
  | 'EXIT'
  | 'SECURITY_POINT'
  | 'CCTV_AREA'
  | 'RESTRICTED_AREA'
  | 'OTHER';

export type CheckpointType =
  | 'ENTRANCE'
  | 'EXIT'
  | 'FLOOR_POINT'
  | 'PARKING_POINT'
  | 'CAMERA_POINT'
  | 'FIRE_EXIT'
  | 'RESTRICTED_POINT'
  | 'GENERAL';

export type PatrolSessionStatus =
  | 'SCHEDULED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'LATE'
  | 'MISSED'
  | 'CANCELLED';

export type PatrolVerificationMethod = 'MANUAL' | 'QR_CODE' | 'NFC' | 'SUPERVISOR_CONFIRMATION';

export type PatrolVisitStatus = 'VERIFIED' | 'SKIPPED' | 'FAILED' | 'OUT_OF_ORDER';

export type PersonnelLocationSource = 'MOBILE' | 'MANUAL' | 'CHECKPOINT' | 'INCIDENT' | 'SUPERVISOR';

export type FieldAlertType =
  | 'SOS'
  | 'PATROL_DELAY'
  | 'CHECKPOINT_MISSED'
  | 'RESTRICTED_AREA'
  | 'OFFLINE_USER'
  | 'INCIDENT_NEARBY'
  | 'SECURITY_NOTICE'
  | 'OTHER';

export type FieldAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FieldAlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

export const ZONE_TYPE_LABELS: Record<SecurityZoneType, string> = {
  BUILDING: 'مبنى',
  FLOOR: 'طابق',
  HALL: 'قاعة',
  OFFICE: 'مكتب',
  PARKING: 'موقف',
  ENTRANCE: 'مدخل',
  EXIT: 'مخرج',
  SECURITY_POINT: 'نقطة أمنية',
  CCTV_AREA: 'منطقة كاميرات',
  RESTRICTED_AREA: 'منطقة محظورة',
  OTHER: 'أخرى',
};

export const CHECKPOINT_TYPE_LABELS: Record<CheckpointType, string> = {
  ENTRANCE: 'مدخل',
  EXIT: 'مخرج',
  FLOOR_POINT: 'نقطة طابق',
  PARKING_POINT: 'نقطة موقف',
  CAMERA_POINT: 'نقطة كاميرا',
  FIRE_EXIT: 'مخرج طوارئ',
  RESTRICTED_POINT: 'نقطة محظورة',
  GENERAL: 'عامة',
};

export const PATROL_STATUS_LABELS: Record<PatrolSessionStatus, string> = {
  SCHEDULED: 'مجدولة',
  ASSIGNED: 'مُسندة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'مكتملة',
  LATE: 'متأخرة',
  MISSED: 'فائتة',
  CANCELLED: 'ملغاة',
};

export const ALERT_TYPE_LABELS: Record<FieldAlertType, string> = {
  SOS: 'نداء استغاثة',
  PATROL_DELAY: 'تأخر جولة',
  CHECKPOINT_MISSED: 'نقطة فائتة',
  RESTRICTED_AREA: 'منطقة محظورة',
  OFFLINE_USER: 'مستخدم غير متصل',
  INCIDENT_NEARBY: 'بلاغ قريب',
  SECURITY_NOTICE: 'تنبيه أمني',
  OTHER: 'أخرى',
};

export const ALERT_SEVERITY_LABELS: Record<FieldAlertSeverity, string> = {
  LOW: 'منخفض',
  MEDIUM: 'متوسط',
  HIGH: 'مرتفع',
  CRITICAL: 'حرج',
};

export const ALERT_STATUS_LABELS: Record<FieldAlertStatus, string> = {
  NEW: 'جديد',
  ACKNOWLEDGED: 'مُستلم',
  IN_PROGRESS: 'قيد المعالجة',
  RESOLVED: 'محلول',
  CANCELLED: 'ملغى',
};

export interface ZoneRef {
  id: string;
  name: string;
  code: string;
  zoneType?: SecurityZoneType;
  floorNumber?: number | null;
}

export interface CheckpointRef {
  id: string;
  name: string;
  code: string;
  mapX: number;
  mapY: number;
}

export interface SecurityZone {
  id: string;
  name: string;
  code: string;
  description: string | null;
  zoneType: SecurityZoneType;
  parentId: string | null;
  floorNumber: number | null;
  mapX: number;
  mapY: number;
  width: number;
  height: number;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: ZoneRef | null;
  children?: ZoneRef[];
  _count?: { checkpoints?: number };
}

export interface SecurityCheckpoint {
  id: string;
  name: string;
  code: string;
  description: string | null;
  zoneId: string;
  latitude: number | null;
  longitude: number | null;
  mapX: number;
  mapY: number;
  checkpointType: CheckpointType;
  qrCodeValue: string;
  nfcTagValue: string | null;
  requiredForPatrol: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  zone?: ZoneRef | null;
}

export interface PatrolRouteCheckpoint {
  id: string;
  routeId: string;
  checkpointId: string;
  orderIndex: number;
  expectedMinutesFromStart: number;
  isRequired: boolean;
  instructions: string | null;
  checkpoint?: CheckpointRef & { zone?: ZoneRef | null };
}

export interface PatrolRoute {
  id: string;
  name: string;
  description: string | null;
  shiftType: string | null;
  groupId: string | null;
  estimatedDurationMinutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  checkpoints?: PatrolRouteCheckpoint[];
  group?: { id: string; nameAr?: string; label?: { nameAr: string } } | null;
  _count?: { sessions?: number; checkpoints?: number };
}

export interface PatrolCheckpointVisit {
  id: string;
  patrolSessionId: string;
  checkpointId: string;
  visitedById: string;
  visitedAt: string;
  verificationMethod: PatrolVerificationMethod;
  mapX: number | null;
  mapY: number | null;
  notes: string | null;
  attachmentUrl: string | null;
  status: PatrolVisitStatus;
  clientSyncId: string | null;
  checkpoint?: CheckpointRef;
  visitedBy?: UserRef;
}

export interface PatrolSession {
  id: string;
  routeId: string;
  assignedUserId: string | null;
  assignedById: string | null;
  shiftSessionId: string | null;
  groupId: string | null;
  status: PatrolSessionStatus;
  scheduledStartAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  notes: string | null;
  priority: number;
  overrideRestingGroup: boolean;
  overrideReason: string | null;
  createdAt: string;
  updatedAt: string;
  route?: PatrolRoute | null;
  assignedUser?: UserRef | null;
  assignedBy?: UserRef | null;
  visits?: PatrolCheckpointVisit[];
  group?: { id: string; nameAr?: string; label?: { nameAr: string } } | null;
}

export interface PersonnelLocation {
  id: string;
  userId: string;
  zoneId: string | null;
  mapX: number;
  mapY: number;
  accuracy: number | null;
  source: PersonnelLocationSource;
  recordedAt: string;
  expiresAt: string | null;
  isCurrent: boolean;
  user?: UserRef & { roleCode?: string; jobTitle?: string | null };
  zone?: ZoneRef | null;
}

export interface FieldAlert {
  id: string;
  title: string;
  description: string;
  alertType: FieldAlertType;
  severity: FieldAlertSeverity;
  zoneId: string | null;
  assignedUserId: string | null;
  assignedGroupId: string | null;
  incidentId: string | null;
  patrolSessionId: string | null;
  mapX: number | null;
  mapY: number | null;
  status: FieldAlertStatus;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  zone?: ZoneRef | null;
  assignedUser?: UserRef | null;
  createdBy?: UserRef | null;
}

export interface MapCctvPoint {
  id: string;
  name: string;
  mapX: number;
  mapY: number;
  zoneId?: string | null;
  status?: string;
}

export interface MapIncidentMarker {
  id: string;
  title: string;
  severity: string;
  status: string;
  mapX: number;
  mapY: number;
  zoneId?: string | null;
  checkpointId?: string | null;
}

export interface MapViolationMarker {
  id: string;
  plateNumber: string;
  status: string;
  mapX: number;
  mapY: number;
  zoneId?: string | null;
}

export interface FieldMapSnapshot {
  zones: SecurityZone[];
  checkpoints: SecurityCheckpoint[];
  personnel: PersonnelLocation[];
  incidents: MapIncidentMarker[];
  violations: MapViolationMarker[];
  alerts: FieldAlert[];
  cctvPoints: MapCctvPoint[];
  activePatrols?: PatrolSession[];
}

export interface FieldOpsOverview {
  activeGroupId?: string | null;
  currentShift?: {
    kind: string;
    kindLabel?: string;
    group?: { id: string; code: string; nameAr?: string; nameEn?: string; label?: string };
    status?: string;
    guardCount?: number;
    supervisorCount?: number;
  } | null;
  workingGroup?: { id: string; code: string; nameAr?: string; nameEn?: string; label?: string } | null;
  openAlerts: number;
  criticalAlerts: number;
  activePatrols: number;
  completedPatrolsToday: number;
  lateOrMissedPatrols: number;
  activeCheckpoints: number;
  activeZones: number;
  personnelOnline: number;
  openIncidentsOnMap: number;
  availablePersonnel?: number;
  busyPersonnel?: number;
  onDutyPersonnel?: number;
  recentAlerts?: FieldAlert[];
  recentPatrols?: PatrolSession[];
}

export interface FieldOpsStatistics {
  patrolsByStatus: Array<{ status: PatrolSessionStatus; count: number }>;
  alertsBySeverity: Array<{ severity: FieldAlertSeverity; count: number }>;
  alertsByType: Array<{ alertType: FieldAlertType; count: number }>;
  visitsByDay: Array<{ day: string; count: number }>;
  checkpointCoverage: Array<{ checkpointId: string; name: string; visits: number }>;
  averagePatrolDurationMinutes: number | null;
  completionRate: number | null;
  sosCount: number;
}

export interface CreateZonePayload {
  name: string;
  code: string;
  description?: string | null;
  zoneType: SecurityZoneType;
  parentId?: string | null;
  floorNumber?: number | null;
  mapX?: number;
  mapY?: number;
  width?: number;
  height?: number;
  color?: string;
  isActive?: boolean;
}

export type UpdateZonePayload = Partial<CreateZonePayload>;

export interface CreateCheckpointPayload {
  name: string;
  code: string;
  description?: string | null;
  zoneId: string;
  mapX?: number;
  mapY?: number;
  latitude?: number | null;
  longitude?: number | null;
  checkpointType?: CheckpointType;
  qrCodeValue?: string;
  nfcTagValue?: string | null;
  requiredForPatrol?: boolean;
  isActive?: boolean;
}

export type UpdateCheckpointPayload = Partial<CreateCheckpointPayload>;

export interface CreatePatrolRoutePayload {
  name: string;
  description?: string | null;
  shiftType?: string | null;
  groupId?: string | null;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
  checkpoints?: Array<{
    checkpointId: string;
    orderIndex: number;
    expectedMinutesFromStart?: number;
    isRequired?: boolean;
    instructions?: string | null;
  }>;
}

export type UpdatePatrolRoutePayload = Partial<CreatePatrolRoutePayload>;

export interface CreatePatrolSessionPayload {
  routeId: string;
  assignedUserId?: string | null;
  shiftSessionId?: string | null;
  groupId?: string | null;
  scheduledStartAt: string;
  notes?: string | null;
  priority?: number;
  overrideRestingGroup?: boolean;
  overrideReason?: string | null;
}

export interface AssignPatrolPayload {
  assignedUserId: string;
  overrideRestingGroup?: boolean;
  overrideReason?: string | null;
}

export interface CancelPatrolPayload {
  cancellationReason?: string | null;
}

export interface RecordPatrolVisitPayload {
  checkpointId: string;
  verificationMethod?: PatrolVerificationMethod;
  mapX?: number | null;
  mapY?: number | null;
  notes?: string | null;
  attachmentUrl?: string | null;
  status?: PatrolVisitStatus;
  clientSyncId: string;
  visitedAt?: string;
}

export interface UpdatePersonnelLocationPayload {
  mapX: number;
  mapY: number;
  zoneId?: string | null;
  accuracy?: number | null;
  source?: PersonnelLocationSource;
  expiresAt?: string | null;
}

export interface CreateFieldAlertPayload {
  title: string;
  description: string;
  alertType: FieldAlertType;
  severity?: FieldAlertSeverity;
  zoneId?: string | null;
  assignedUserId?: string | null;
  assignedGroupId?: string | null;
  incidentId?: string | null;
  patrolSessionId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}

export interface SosAlertPayload {
  description?: string;
  zoneId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}

export interface ResolveAlertPayload {
  resolutionNote?: string | null;
  cancel?: boolean;
}

export interface FieldMapFilters {
  type?: string;
  location?: string;
  floor?: string | number;
  shift?: string;
  group?: string;
  status?: string;
  severity?: string;
  zoneId?: string;
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  isActive?: boolean;
  zoneId?: string;
  routeId?: string;
  assignedUserId?: string;
  alertType?: string;
  severity?: string;
  from?: string;
  to?: string;
}

export interface NearestPersonnelResult {
  userId: string;
  fullName: string;
  employeeNumber: string;
  mapX: number;
  mapY: number;
  distance: number;
  zone?: ZoneRef | null;
}
