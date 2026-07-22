export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type SavedReportType =
  | 'DAILY_SECURITY'
  | 'SHIFT_REPORT'
  | 'HANDOVER_REPORT'
  | 'INCIDENT_REPORT'
  | 'EMERGENCY_REPORT'
  | 'PATROL_REPORT'
  | 'CHECKPOINT_REPORT'
  | 'CCTV_REFERRAL_REPORT'
  | 'PERMIT_REPORT'
  | 'VISITOR_REPORT'
  | 'VEHICLE_VIOLATION_REPORT'
  | 'RESPONSE_TIME_REPORT'
  | 'PERSONNEL_PERFORMANCE'
  | 'GROUP_PERFORMANCE'
  | 'SHIFT_PERFORMANCE'
  | 'LOCATION_ANALYSIS'
  | 'AUDIT_REPORT'
  | 'CUSTOM';

export type SavedReportStatus =
  | 'DRAFT'
  | 'GENERATED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'FAILED';

export type ReportScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'END_OF_SHIFT';

export type ReportClassification = 'INTERNAL' | 'CONFIDENTIAL' | 'HIGHLY_CONFIDENTIAL';

export type ReportSectionType =
  | 'SUMMARY'
  | 'KPI'
  | 'TABLE'
  | 'CHART'
  | 'TEXT'
  | 'TIMELINE'
  | 'RECOMMENDATIONS'
  | 'SIGNATURES'
  | 'ATTACHMENTS_LIST';

export type ReportApprovalAction =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'RETURN'
  | 'ARCHIVE'
  | 'CREATE_VERSION';

export interface AvgMetric {
  averageMs: number | null;
  averageMinutes: number | null;
  sampleCount: number;
}

export interface UserBrief {
  id: string;
  fullName: string;
  employeeNumber?: string;
}

export interface ReportSection {
  id: string;
  reportId: string;
  sectionKey: string;
  title: string;
  sectionType: ReportSectionType | string;
  orderIndex: number;
  contentJson?: unknown;
  textContent?: string | null;
}

export interface ReportApproval {
  id: string;
  reportId: string;
  action: ReportApprovalAction | string;
  notes?: string | null;
  createdAt: string;
  approver?: UserBrief | null;
}

export interface SavedReport {
  id: string;
  reportNumber: string;
  title: string;
  description?: string | null;
  reportType: SavedReportType;
  status: SavedReportStatus;
  dateFrom: string;
  dateTo: string;
  shiftType?: string | null;
  groupId?: string | null;
  zoneId?: string | null;
  userId?: string | null;
  filtersJson?: unknown;
  summaryJson?: unknown;
  notes?: string | null;
  recommendations?: string | null;
  classification: ReportClassification | string;
  version: number;
  generatedAt: string;
  generatedById: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  deletedAt?: string | null;
  sections?: ReportSection[];
  approvals?: ReportApproval[];
  generatedBy?: UserBrief | null;
  approvedBy?: UserBrief | null;
}

export interface SavedReportsListParams {
  page?: number;
  pageSize?: number;
  reportType?: SavedReportType;
  status?: SavedReportStatus;
  generatedById?: string;
  from?: string;
  to?: string;
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedReports {
  data: SavedReport[];
  meta: PaginatedMeta;
}

export interface GenerateReportPayload {
  reportType: SavedReportType;
  title?: string;
  description?: string | null;
  dateFrom: string;
  dateTo: string;
  shiftType?: string | null;
  groupId?: string | null;
  zoneId?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  filtersJson?: Record<string, unknown>;
  notes?: string | null;
  recommendations?: string | null;
  classification?: ReportClassification;
}

export interface CustomReportPayload {
  title: string;
  dateFrom: string;
  dateTo: string;
  dataSources: CustomDataSource[];
  fields?: Partial<Record<CustomDataSource, string[]>>;
  groupId?: string | null;
  zoneId?: string | null;
  userId?: string | null;
  notes?: string | null;
}

export const CUSTOM_DATA_SOURCES = [
  'incidents',
  'response_times',
  'patrols',
  'cctv_referrals',
  'permits',
  'violations',
  'visitors',
  'personnel',
  'groups',
  'shifts',
] as const;

export type CustomDataSource = (typeof CUSTOM_DATA_SOURCES)[number];

export const CUSTOM_FIELD_ALLOWLIST: Record<CustomDataSource, readonly string[]> = {
  incidents: ['total', 'open', 'closed', 'bySeverity', 'avgAckMinutes', 'avgResolveMinutes'],
  response_times: ['overall', 'byMetric'],
  patrols: ['total', 'completed', 'inProgress', 'cancelled'],
  cctv_referrals: ['total', 'byStatus', 'avgReceive', 'avgResolve'],
  permits: ['total', 'byStatus'],
  violations: ['total', 'byStatus'],
  visitors: ['total', 'byStatus'],
  personnel: ['onDutyCount'],
  groups: ['total', 'items'],
  shifts: ['total', 'open', 'closed', 'byKind'],
};

export interface KpiQuery {
  from: string;
  to: string;
  groupId?: string;
  userId?: string;
  zoneId?: string;
}

export interface KpiOverview {
  range: { from: string; to: string };
  incidents: {
    total: number;
    open: number;
    closed: number;
    bySeverity: Array<{ severity: string; count: number }>;
    avgAckMinutes: AvgMetric;
    avgResponseStartMinutes: AvgMetric;
    avgArriveMinutes: AvgMetric;
    avgResolveMinutes: AvgMetric;
  };
  responseTimes: {
    overall: AvgMetric;
    byMetric: Record<string, AvgMetric>;
  };
  patrols: {
    total: number;
    completed: number;
    inProgress: number;
    cancelled: number;
  };
  cctvReferrals: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
    avgReceive: AvgMetric;
    avgStart: AvgMetric;
    avgArrive: AvgMetric;
    avgResolve: AvgMetric;
  };
  permits: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  violations: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  visitors: {
    total: number;
    byStatus: Array<{ status: string; count: number }>;
  };
  personnel: { onDutyCount: number };
  groups: {
    total: number;
    items: Array<{ id: string; code: string; nameEn: string; nameAr: string }>;
  };
  shifts: {
    total: number;
    open: number;
    closed: number;
    byKind: { MORNING: number; EVENING: number };
  };
}

export interface ReportsDashboard {
  period: ReportPeriod;
  label: string;
  range: { from: string; to: string };
  summary: {
    period: ReportPeriod;
    label: string;
    range: { from: string; to: string };
    violations: number;
    incidents: number;
    visitors: number;
    complaints: number;
    openIncidents: number;
    openComplaints: number;
    averageResponseMs: number | null;
    averageResponseMinutes: number | null;
  };
  kpis: KpiOverview;
  recentReports: Array<{
    id: string;
    title: string;
    reportNumber: string;
    reportType: SavedReportType;
    status: SavedReportStatus;
    generatedAt: string;
    version: number;
  }>;
  pendingApproval: number;
  reportsByStatus: Array<{ status: SavedReportStatus; count: number }>;
}

export interface ReportSchedule {
  id: string;
  name: string;
  reportType: SavedReportType;
  frequency: ReportScheduleFrequency;
  timeOfDay: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  shiftType?: string | null;
  groupId?: string | null;
  filtersJson?: unknown;
  recipientsJson?: unknown;
  generatePdf: boolean;
  generateCsv: boolean;
  isActive: boolean;
  nextRunAt?: string | null;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SchedulePayload {
  name: string;
  reportType: SavedReportType;
  frequency: ReportScheduleFrequency;
  timeOfDay: string;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  shiftType?: string | null;
  groupId?: string | null;
  filtersJson?: Record<string, unknown>;
  recipientsJson?: unknown;
  generatePdf?: boolean;
  generateCsv?: boolean;
  isActive?: boolean;
}

export interface ApprovalNotesPayload {
  notes?: string | null;
}

export interface RejectNotesPayload {
  notes: string;
}

export const SAVED_REPORT_TYPE_LABELS: Record<SavedReportType, string> = {
  DAILY_SECURITY: 'التقرير الأمني اليومي',
  SHIFT_REPORT: 'تقرير الوردية',
  HANDOVER_REPORT: 'تسليم واستلام الوردية',
  INCIDENT_REPORT: 'تقرير الحوادث',
  EMERGENCY_REPORT: 'تقرير الطوارئ',
  PATROL_REPORT: 'تقرير الجولات الأمنية',
  CHECKPOINT_REPORT: 'تقرير النقاط الأمنية',
  CCTV_REFERRAL_REPORT: 'تقرير إحالات كاميرات المراقبة',
  PERMIT_REPORT: 'تقرير التصاريح',
  VISITOR_REPORT: 'تقرير الزوار',
  VEHICLE_VIOLATION_REPORT: 'تقرير مخالفات المركبات',
  RESPONSE_TIME_REPORT: 'تقرير أوقات الاستجابة',
  PERSONNEL_PERFORMANCE: 'أداء الأفراد',
  GROUP_PERFORMANCE: 'أداء المجموعات',
  SHIFT_PERFORMANCE: 'أداء الورديات',
  LOCATION_ANALYSIS: 'تحليل المواقع',
  AUDIT_REPORT: 'تقرير التدقيق',
  CUSTOM: 'تقرير مخصص',
};

export const SAVED_REPORT_STATUS_LABELS: Record<SavedReportStatus, string> = {
  DRAFT: 'مسودة',
  GENERATED: 'مُنشأ',
  UNDER_REVIEW: 'قيد المراجعة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  ARCHIVED: 'مؤرشف',
  FAILED: 'فشل',
};

export const SCHEDULE_FREQUENCY_LABELS: Record<ReportScheduleFrequency, string> = {
  DAILY: 'يومي',
  WEEKLY: 'أسبوعي',
  MONTHLY: 'شهري',
  END_OF_SHIFT: 'نهاية الوردية',
};

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  yearly: 'سنوي',
};

export const CUSTOM_DATA_SOURCE_LABELS: Record<CustomDataSource, string> = {
  incidents: 'الحوادث',
  response_times: 'أوقات الاستجابة',
  patrols: 'الجولات الأمنية',
  cctv_referrals: 'إحالات كاميرات المراقبة',
  permits: 'التصاريح',
  violations: 'مخالفات المركبات',
  visitors: 'الزوار',
  personnel: 'الأفراد',
  groups: 'المجموعات',
  shifts: 'الورديات',
};
