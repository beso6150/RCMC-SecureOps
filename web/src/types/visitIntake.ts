/** Smart visit-request email intake — shared types */

export interface VisitEmailInboxSettings {
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  username: string;
  password: string;
  useSslTls: boolean;
  enabled: boolean;
  pollIntervalMinutes: number;
}

export const VISIT_EMAIL_SETTING_KEY = 'visitors.emailInbox';

export const DEFAULT_VISIT_EMAIL_SETTINGS: VisitEmailInboxSettings = {
  emailAddress: '',
  imapHost: '',
  imapPort: 993,
  username: '',
  password: '',
  useSslTls: true,
  enabled: false,
  pollIntervalMinutes: 5,
};

export type VisitIntakeSourceKind =
  | 'email_text'
  | 'whatsapp_screenshot'
  | 'mobile_image'
  | 'pdf'
  | 'manual';

export type VisitIntakeFieldKey =
  | 'visitorName'
  | 'dayLabel'
  | 'visitDate'
  | 'arrivalTime'
  | 'hostOrRoom'
  | 'visitorParkingCount'
  | 'mobile'
  | 'notes';

export interface VisitIntakeExtractedFields {
  visitorName: string | null;
  dayLabel: string | null;
  visitDate: string | null;
  arrivalTime: string | null;
  hostOrRoom: string | null;
  visitorParkingCount: number | null;
  mobile: string | null;
  notes: string | null;
}

export interface VisitIntakeExtractionResult {
  fields: VisitIntakeExtractedFields;
  missingFields: VisitIntakeFieldKey[];
  isComplete: boolean;
  confidence: number;
  sourceKind: VisitIntakeSourceKind;
  rawText: string;
  ocrUsed: boolean;
}

export interface VisitIntakeMeta {
  version: 1;
  approvalStatus: 'PENDING_APPROVAL';
  approvalStatusLabelAr: 'بانتظار الاعتماد';
  missingFields: VisitIntakeFieldKey[];
  isComplete: boolean;
  sourceKind: VisitIntakeSourceKind;
  emailIngestId?: string | null;
  visitorParkingCount?: number | null;
  dayLabel?: string | null;
  hostOrRoom?: string | null;
}

export interface VisitEmailIngestRecord {
  id: string;
  subject: string;
  body: string;
  receivedAt: string;
  senderDomain: string;
  senderEmail: string | null;
  visitorId: string | null;
  parseStatus: 'PENDING' | 'PROCESSED' | 'REJECTED';
  rawHeaders?: unknown;
  createdAt?: string;
}

export interface VisitHost {
  id: string;
  employeeNumber: string;
  employeeName: string;
  phone: string | null;
  email: string | null;
  departmentId?: string | null;
}

export interface CreateVisitorPayload {
  visitorName: string;
  nationalId?: string | null;
  organization?: string | null;
  mobile?: string | null;
  vehiclePlate?: string | null;
  visitDate: string;
  arrivalTime?: string | null;
  departureTime?: string | null;
  importance?: 'NORMAL' | 'VIP';
  purpose?: string | null;
  hostId: string;
  floorId?: string | null;
  meetingRoomId?: string | null;
  locationId?: string | null;
  badgeNumber?: string | null;
}

export const VISIT_INTAKE_FIELD_LABELS: Record<VisitIntakeFieldKey, string> = {
  visitorName: 'اسم الزائر',
  dayLabel: 'اليوم',
  visitDate: 'التاريخ',
  arrivalTime: 'وقت الوصول',
  hostOrRoom: 'القاعة / الشخص المعني',
  visitorParkingCount: 'عدد مواقف الزوار',
  mobile: 'رقم الجوال',
  notes: 'الملاحظات',
};
