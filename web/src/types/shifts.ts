export type OperationalStatus =
  | 'ON_DUTY'
  | 'ON_PATROL'
  | 'HANDLING_INCIDENT'
  | 'FIELD_TASK'
  | 'WITH_CCTV'
  | 'ON_BREAK'
  | 'OFF_DUTY';

export type ShiftKind = 'MORNING' | 'EVENING';

export type ShiftGroupCode = 'A' | 'B' | 'C' | 'D';

export type ShiftSessionStatus = 'OPEN' | 'HANDOVER_PENDING' | 'CLOSED';

export type HandoverStepStatus = 'PENDING' | 'APPROVED';

export interface ShiftGroupRef {
  id: string;
  code: ShiftGroupCode;
  nameAr: string;
  nameEn: string;
  label: { nameAr: string; nameEn: string };
}

export interface ShiftGroupChip {
  code: ShiftGroupCode;
  label: { nameAr: string; nameEn: string };
}

export interface ShiftKindLabel {
  nameAr: string;
  nameEn: string;
}

export interface ShiftWindow {
  startsAt: string;
  endsAt: string;
  serviceDate: string;
  cycleDay: number;
}

export interface ShiftCard {
  kind: ShiftKind;
  kindLabel: ShiftKindLabel;
  group: ShiftGroupRef;
  guardCount: number;
  supervisorCount: number;
  status: ShiftSessionStatus;
  isActive: boolean;
  window: ShiftWindow;
}

export interface ShiftCycleConfig {
  morningStartTime: string;
  morningEndTime: string;
  eveningStartTime: string;
  eveningEndTime: string;
  timezone: string;
}

export interface ShiftOverview {
  morning: ShiftCard;
  evening: ShiftCard;
  groups: ShiftGroupRef[];
  cycleStart: string;
  cycleEnd: string;
  currentCycleDay: number;
  activeKind: ShiftKind;
  activeKindLabel: ShiftKindLabel;
  msRemainingToSwitch: number;
  restingGroups: ShiftGroupChip[];
  nextGroup: ShiftGroupRef;
  config: ShiftCycleConfig;
}

export interface ShiftOpsShiftSummary {
  group: ShiftGroupRef;
  isActive: boolean;
  status: ShiftSessionStatus;
  guardCount: number;
  supervisorCount: number;
}

export interface ShiftOpsBoard {
  morning: ShiftOpsShiftSummary;
  evening: ShiftOpsShiftSummary;
  activeKind: ShiftKind;
  activeKindLabel: ShiftKindLabel;
  activeGroup: ShiftGroupRef;
  nextGroup: ShiftGroupRef;
  restingGroups: ShiftGroupChip[];
  onDutyCount: number;
  onTaskCount: number;
  availableCount: number;
  activeIncidents: number;
  criticalIncidents: number;
  averageResponseMs: number | null;
  msRemainingToSwitch: number;
  currentCycleDay: number;
  cycleStart: string;
  cycleEnd: string;
  sessionStatus: ShiftSessionStatus;
  guardCount: number;
  supervisorCount: number;
}

export interface ShiftPersonnel {
  id: string;
  fullName: string;
  employeeNumber: string;
  operationalStatus: OperationalStatus;
  jobTitle: string | null;
  role: { code: string; nameAr: string; nameEn: string };
  group: { id: string; code: ShiftGroupCode; nameAr: string; nameEn: string } | null;
}

export interface ShiftAssignablePerson {
  id: string;
  fullName: string;
  employeeNumber: string;
  operationalStatus: OperationalStatus;
  role: { code: string; nameAr: string };
  group: { id: string; code: ShiftGroupCode; nameAr: string } | null;
}

export interface UpdateCycleConfigPayload {
  cycleStartDate?: string;
  morningStartTime?: string;
  morningEndTime?: string;
  eveningStartTime?: string;
  eveningEndTime?: string;
  timezone?: string;
}

export interface ShiftHandoverSupervisor {
  id: string;
  fullName: string;
  employeeNumber: string;
}

export interface ShiftHandoverRecord {
  id: string;
  sessionId: string;
  outgoingSupervisorId: string;
  incomingSupervisorId: string;
  notes: string | null;
  equipmentNotes?: string | null;
  openIncidentsCount: number;
  closedIncidentsCount: number;
  patrolsCount: number;
  violationsCount: number;
  handoverStatus: HandoverStepStatus;
  takeoverStatus: HandoverStepStatus;
  handoverApprovedAt: string | null;
  takeoverApprovedAt: string | null;
  outgoingSupervisor: ShiftHandoverSupervisor;
  incomingSupervisor: ShiftHandoverSupervisor;
  handoverApprovedBy: { id: string; fullName: string } | null;
  takeoverApprovedBy: { id: string; fullName: string } | null;
  session?: {
    id: string;
    kind: ShiftKind;
    startsAt: string;
    endsAt: string;
    group: ShiftGroupRef;
  };
}

export interface ShiftHandoverSession {
  id: string;
  kind: ShiftKind;
  kindLabel: ShiftKindLabel;
  status: ShiftSessionStatus;
  startsAt: string;
  endsAt: string;
  msRemaining: number;
  group: ShiftGroupRef;
}

export interface ShiftSessionStats {
  openIncidents: number;
  closedIncidents: number;
  patrols: number;
  violations: number;
  complaints?: number;
  averageResponseMs: number | null;
  fastestResponseMs: number | null;
  slowestResponseMs: number | null;
}

export interface ShiftHandoverHistoryItem {
  id: string;
  notes: string | null;
  equipmentNotes: string | null;
  openIncidentsCount: number;
  closedIncidentsCount: number;
  patrolsCount: number;
  violationsCount: number;
  handoverStatus: HandoverStepStatus;
  takeoverStatus: HandoverStepStatus;
  handoverApprovedAt: string | null;
  takeoverApprovedAt: string | null;
  createdAt: string;
  updatedAt: string;
  outgoingSupervisor: ShiftHandoverSupervisor;
  incomingSupervisor: ShiftHandoverSupervisor;
  session: {
    kind: ShiftKind;
    kindLabel: ShiftKindLabel;
    startsAt: string;
    endsAt: string;
    status: ShiftSessionStatus;
    group: ShiftGroupRef;
  };
}

export interface ShiftHandoverBoard {
  session: ShiftHandoverSession | null;
  handover: ShiftHandoverRecord | null;
  stats: ShiftSessionStats | null;
  outgoingGroup: ShiftGroupRef | null;
  incomingGroup: ShiftGroupRef | null;
  history: ShiftHandoverHistoryItem[];
}

export interface UpsertHandoverPayload {
  sessionId: string;
  outgoingSupervisorId: string;
  incomingSupervisorId: string;
  notes?: string | null;
  equipmentNotes?: string | null;
}

export interface ShiftStatisticsSession {
  sessionId: string;
  kind: ShiftKind;
  kindLabel: ShiftKindLabel;
  group: ShiftGroupRef;
  cycleDay: number;
  serviceDate: string;
  startsAt: string;
  endsAt: string;
  status: ShiftSessionStatus;
  openIncidents: number;
  closedIncidents: number;
  patrols: number;
  violations: number;
  complaints: number;
  averageResponseMs: number | null;
  fastestResponseMs: number | null;
  slowestResponseMs: number | null;
  guardCount: number;
  supervisorCount: number;
  performanceScore: number;
}

export interface ShiftStatisticsTotals {
  sessions: number;
  openIncidents: number;
  closedIncidents: number;
  patrols: number;
  violations: number;
  complaints: number;
  averageResponseMs: number | null;
  averagePerformanceScore: number | null;
}

export interface ShiftStatistics {
  range: { from: string; to: string };
  totals: ShiftStatisticsTotals;
  sessions: ShiftStatisticsSession[];
}

export const OPERATIONAL_STATUS_LABELS: Record<
  OperationalStatus,
  { nameAr: string; emoji: string }
> = {
  ON_DUTY: { nameAr: 'في الخدمة', emoji: '🟢' },
  ON_PATROL: { nameAr: 'يقوم بجولة', emoji: '🚶' },
  HANDLING_INCIDENT: { nameAr: 'مباشر بلاغ', emoji: '🚨' },
  FIELD_TASK: { nameAr: 'مهمة ميدانية', emoji: '📍' },
  WITH_CCTV: { nameAr: 'يعمل مع غرفة المراقبة', emoji: '📷' },
  ON_BREAK: { nameAr: 'استراحة', emoji: '☕' },
  OFF_DUTY: { nameAr: 'خارج الخدمة', emoji: '❌' },
};

export const SESSION_STATUS_LABELS: Record<ShiftSessionStatus, string> = {
  OPEN: 'مفتوحة',
  HANDOVER_PENDING: 'بانتظار التسليم',
  CLOSED: 'مغلقة',
};

export const HANDOVER_STEP_LABELS: Record<HandoverStepStatus, string> = {
  PENDING: 'معلّق',
  APPROVED: 'معتمد',
};

export const ALL_OPERATIONAL_STATUSES: OperationalStatus[] = [
  'ON_DUTY',
  'ON_PATROL',
  'HANDLING_INCIDENT',
  'FIELD_TASK',
  'WITH_CCTV',
  'ON_BREAK',
  'OFF_DUTY',
];
