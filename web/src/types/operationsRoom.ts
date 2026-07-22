export type OpsIncidentStatus =
  | 'NEW'
  | 'REPORTED'
  | 'ACKNOWLEDGED'
  | 'ASSESSING'
  | 'ASSIGNED'
  | 'RESPONDING'
  | 'ON_SCENE'
  | 'CONTAINED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'CLOSED'
  | 'ESCALATED'
  | 'REOPENED'
  | 'CANCELLED'
  | 'FALSE_ALARM';

export type OpsIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OpsIncidentSource =
  | 'SECURITY_GUARD'
  | 'SUPERVISOR'
  | 'CCTV_OPERATOR'
  | 'CCTV_REFERRAL'
  | 'PATROL'
  | 'FIELD_ALERT'
  | 'SOS'
  | 'VEHICLE_VIOLATION'
  | 'VISITOR'
  | 'OPERATIONS_ROOM'
  | 'SYSTEM'
  | 'OTHER';

export interface OpsUserBrief {
  id: string;
  fullName: string;
  employeeNumber: string;
}

export interface OpsIncidentType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

export interface OpsIncidentListItem {
  id: string;
  incidentNumber: string | null;
  title: string;
  description: string;
  status: OpsIncidentStatus;
  severity: OpsIncidentSeverity;
  source?: OpsIncidentSource | null;
  typeId: string;
  type: OpsIncidentType;
  assigneeId?: string | null;
  assignedUserId?: string | null;
  reporterId?: string | null;
  supervisorId?: string | null;
  opsManagerId?: string | null;
  relatedReferralId?: string | null;
  requiresFollowUp?: boolean;
  followUpDueAt?: string | null;
  reportedAt?: string | null;
  occurredAt?: string;
  createdAt: string;
  startedAt?: string | null;
  closedAt?: string | null;
  resolvedAt?: string | null;
  assignee?: OpsUserBrief | null;
  reporter?: OpsUserBrief | null;
  supervisor?: OpsUserBrief | null;
  opsManager?: OpsUserBrief | null;
  zone?: { id: string; name: string; code: string } | null;
  zoneId?: string | null;
  checkpointId?: string | null;
  floorId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  floor?: { id: string; nameAr?: string; nameEn?: string; number?: number } | null;
  checkpoint?: { id: string; name: string; code: string } | null;
}

export interface OpsIncidentNote {
  id: string;
  content: string;
  noteType: string;
  visibility: string;
  createdAt: string;
  createdBy?: OpsUserBrief | null;
}

export interface OpsIncidentContactLog {
  id: string;
  contactType: string;
  organizationName?: string | null;
  contactPerson?: string | null;
  phoneNumberMasked?: string | null;
  result: string;
  referenceNumber?: string | null;
  notes?: string | null;
  contactedAt: string;
  contactedBy?: OpsUserBrief | null;
}

export interface OpsIncidentTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: OpsIncidentSeverity;
  dueAt?: string | null;
  completedAt?: string | null;
  completionNotes?: string | null;
  assignedUserId?: string | null;
}

export interface OpsIncidentFollowUp {
  id: string;
  title: string;
  description: string;
  status: string;
  dueAt: string;
  completedAt?: string | null;
  result?: string | null;
  assignedToId?: string | null;
}

export interface OpsIncidentHistory {
  id: string;
  action: string;
  fromStatus?: OpsIncidentStatus | null;
  toStatus?: OpsIncidentStatus | null;
  notes?: string | null;
  createdAt: string;
  actor?: OpsUserBrief | null;
}

export interface OpsIncidentAssignment {
  id: string;
  assignmentType: string;
  assignedAt: string;
  reason?: string | null;
  assignedUser?: OpsUserBrief | null;
  assignedBy?: OpsUserBrief | null;
}

export interface OpsIncidentAttachment {
  id: string;
  fileName: string;
  originalFileName?: string | null;
  mimeType: string;
  fileSize: number;
  description?: string | null;
  type?: string;
  createdAt: string;
}

export interface OpsIncidentDetail extends OpsIncidentListItem {
  notes?: string | null;
  notesList?: OpsIncidentNote[];
  contactLogs?: OpsIncidentContactLog[];
  tasks?: OpsIncidentTask[];
  followUps?: OpsIncidentFollowUp[];
  history?: OpsIncidentHistory[];
  assignments?: OpsIncidentAssignment[];
  attachments?: OpsIncidentAttachment[];
  comments?: Array<{
    id: string;
    body: string;
    createdAt: string;
    author?: OpsUserBrief | null;
  }>;
  procedureSteps?: Array<{
    id: string;
    stepIndex: number;
    title?: string | null;
    completedAt?: string | null;
    notes?: string | null;
  }>;
  resolutionSummary?: string | null;
  rootCause?: string | null;
  actionsTaken?: string | null;
  recommendations?: string | null;
  escalationReason?: string | null;
  escalationLevel?: number;
  acknowledgedAt?: string | null;
  assessedAt?: string | null;
  arrivedAt?: string | null;
  containedAt?: string | null;
  responseStartedAt?: string | null;
  locationDescription?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  acknowledgedBy?: OpsUserBrief | null;
  assessedBy?: OpsUserBrief | null;
  closedBy?: OpsUserBrief | null;
}

export interface OpsRoomDashboard {
  summary: {
    openCount: number;
    criticalOpen: number;
    highOpen: number;
    unassigned: number;
    escalated: number;
    createdToday: number;
    closedToday: number;
  };
  byStatus: Array<{ status: OpsIncidentStatus; count: number }>;
  bySeverity: Array<{ severity: OpsIncidentSeverity; count: number }>;
  recent: Array<{
    id: string;
    incidentNumber: string | null;
    title: string;
    status: OpsIncidentStatus;
    severity: OpsIncidentSeverity;
    source?: OpsIncidentSource | null;
    assigneeId?: string | null;
    assignedUserId?: string | null;
    reportedAt?: string | null;
    createdAt: string;
    assignee?: OpsUserBrief | null;
  }>;
}

export interface OpsRoomStatistics {
  total: number;
  closed: number;
  cancelled: number;
  falseAlarm: number;
  open: number;
  avgResponseMs: number | null;
  byType: Array<{
    typeId: string;
    count: number;
    type: OpsIncidentType | null;
  }>;
  bySource: Array<{
    source: OpsIncidentSource | null;
    count: number;
  }>;
}

export interface EmergencyProcedure {
  id: string;
  name: string;
  code: string;
  incidentTypeCode: string;
  severity?: OpsIncidentSeverity | null;
  description: string;
  instructionsJson: unknown;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateIncidentPayload {
  typeId?: string;
  typeCode?: string;
  title: string;
  description: string;
  notes?: string | null;
  severity?: OpsIncidentSeverity;
  parkingCode?: string | null;
  floorId?: string | null;
  zoneId?: string | null;
  checkpointId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  supervisorId?: string | null;
  opsManagerId?: string | null;
  autoAssign?: boolean;
}

export interface ListOpsIncidentsParams {
  page?: number;
  pageSize?: number;
  status?: OpsIncidentStatus | string;
  severity?: OpsIncidentSeverity | string;
  typeId?: string;
  typeCode?: string;
  assigneeId?: string;
  search?: string;
  from?: string;
  to?: string;
  mine?: boolean;
}

export interface PaginatedOpsResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export const OPS_INCIDENT_STATUS_LABELS: Record<OpsIncidentStatus, string> = {
  NEW: 'جديد',
  REPORTED: 'مُبلَّغ',
  ACKNOWLEDGED: 'مُعتمد',
  ASSESSING: 'قيد التقييم',
  ASSIGNED: 'مُسند',
  RESPONDING: 'قيد الاستجابة',
  ON_SCENE: 'في الموقع',
  CONTAINED: 'محتوى',
  IN_PROGRESS: 'قيد المعالجة',
  ON_HOLD: 'معلّق',
  RESOLVED: 'محلول',
  CLOSED: 'مُغلق',
  ESCALATED: 'مُصعَّد',
  REOPENED: 'أُعيد فتحه',
  CANCELLED: 'ملغى',
  FALSE_ALARM: 'إنذار كاذب',
};

export const OPS_SEVERITY_LABELS: Record<OpsIncidentSeverity, string> = {
  LOW: 'منخفض',
  MEDIUM: 'متوسط',
  HIGH: 'مرتفع',
  CRITICAL: 'حرج',
};

export const OPS_SOURCE_LABELS: Record<OpsIncidentSource, string> = {
  SECURITY_GUARD: 'حارس أمن',
  SUPERVISOR: 'مشرف',
  CCTV_OPERATOR: 'مشغلة CCTV',
  CCTV_REFERRAL: 'إحالة مراقبة',
  PATROL: 'جولة',
  FIELD_ALERT: 'تنبيه ميداني',
  SOS: 'استغاثة',
  VEHICLE_VIOLATION: 'مخالفة مركبة',
  VISITOR: 'زائر',
  OPERATIONS_ROOM: 'غرفة العمليات',
  SYSTEM: 'النظام',
  OTHER: 'أخرى',
};

export const OPS_ACTIVE_STATUSES: OpsIncidentStatus[] = [
  'NEW',
  'REPORTED',
  'ACKNOWLEDGED',
  'ASSESSING',
  'ASSIGNED',
  'RESPONDING',
  'ON_SCENE',
  'CONTAINED',
  'IN_PROGRESS',
  'ON_HOLD',
  'ESCALATED',
  'REOPENED',
  'RESOLVED',
];
