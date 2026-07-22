export type SecurityPermitType =
  | 'VISITOR'
  | 'VEHICLE'
  | 'CONTRACTOR'
  | 'MAINTENANCE'
  | 'DELIVERY'
  | 'TEMPORARY_ACCESS'
  | 'VIP'
  | 'OTHER';

export type SecurityPermitStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'USED'
  | 'REJECTED';

export type PermitImportance = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export type PermitShareStatus = 'SENT' | 'DELIVERED' | 'VIEWED' | 'ACKNOWLEDGED' | 'FAILED';

export type SecurityReferralType =
  | 'SUSPICIOUS_PERSON'
  | 'SUSPICIOUS_VEHICLE'
  | 'PARKING_VIOLATION'
  | 'UNAUTHORIZED_ACCESS'
  | 'DOOR_OPEN'
  | 'CROWDING'
  | 'SAFETY_RISK'
  | 'LOST_ITEM'
  | 'PROPERTY_DAMAGE'
  | 'SECURITY_OBSERVATION'
  | 'OTHER';

export type SecurityReferralSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityReferralStatus =
  | 'NEW'
  | 'SENT'
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ESCALATED';

export type ReferralAttachmentType = 'IMAGE' | 'SCREENSHOT' | 'DOCUMENT' | 'VIDEO_SHORT' | 'OTHER';

export interface CctvUserBrief {
  id: string;
  fullName: string;
  employeeNumber: string;
  operationalStatus?: string;
  role?: { code: string; nameAr: string };
  group?: { id: string; code: string; nameAr: string } | null;
}

export interface SecurityPermit {
  id: string;
  permitNumber: string;
  permitType: SecurityPermitType;
  title: string;
  holderName: string;
  nationalId?: string | null;
  employeeNumber?: string | null;
  companyName?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  hostName?: string | null;
  hostDepartment?: string | null;
  allowedZoneId?: string | null;
  allowedFloor?: string | null;
  validFrom: string;
  validTo: string;
  status: SecurityPermitStatus;
  importance: PermitImportance;
  notes?: string | null;
  attachmentUrl?: string | null;
  attachmentFileName?: string | null;
  attachmentMimeType?: string | null;
  cancelReason?: string | null;
  rejectReason?: string | null;
  createdById: string;
  createdAt: string;
  createdBy?: CctvUserBrief;
  allowedZone?: { id: string; code: string; name: string } | null;
  shares?: PermitShare[];
}

export interface PermitShare {
  id: string;
  permitId: string;
  sharedById: string;
  sharedWithUserId?: string | null;
  sharedWithGroupId?: string | null;
  sharedWithRole?: string | null;
  message?: string | null;
  sentAt: string;
  status: PermitShareStatus;
  sharedBy?: CctvUserBrief;
  sharedWithUser?: CctvUserBrief | null;
  sharedWithGroup?: { id: string; code: string; nameAr: string } | null;
}

export interface SecurityReferral {
  id: string;
  referralNumber: string;
  title: string;
  description: string;
  referralType: SecurityReferralType;
  severity: SecurityReferralSeverity;
  status: SecurityReferralStatus;
  zoneId?: string | null;
  checkpointId?: string | null;
  floorNumber?: number | null;
  cameraCode?: string | null;
  occurredAt: string;
  createdById: string;
  assignedUserId?: string | null;
  assignedGroupId?: string | null;
  assignedAt?: string | null;
  receivedAt?: string | null;
  startedAt?: string | null;
  arrivedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  escalationLevel: number;
  escalatedAt?: string | null;
  escalationReason?: string | null;
  resolutionSummary?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  needsFollowUp: boolean;
  notes?: string | null;
  createdAt: string;
  createdBy?: CctvUserBrief;
  assignedUser?: CctvUserBrief | null;
  assignedBy?: CctvUserBrief | null;
  assignedGroup?: { id: string; code: string; nameAr?: string; name?: string } | null;
  zone?: { id: string; code: string; name?: string; nameAr?: string } | null;
  checkpoint?: { id: string; code: string; name?: string; nameAr?: string } | null;
  attachments?: ReferralAttachment[];
  updates?: ReferralUpdate[];
  responses?: ReferralResponse[];
  _count?: { attachments: number };
}

export interface ReferralAttachment {
  id: string;
  referralId: string;
  attachmentType: ReferralAttachmentType;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  description?: string | null;
  createdAt: string;
  uploadedBy?: CctvUserBrief | null;
}

export interface ReferralUpdate {
  id: string;
  referralId: string;
  updateType: string;
  message?: string | null;
  oldStatus?: SecurityReferralStatus | null;
  newStatus?: SecurityReferralStatus | null;
  createdAt: string;
  user?: CctvUserBrief;
}

export interface ReferralResponse {
  id: string;
  responseType: string;
  result: string;
  notes?: string | null;
  attachmentUrl?: string | null;
  respondedAt: string;
  responder?: CctvUserBrief;
}

/** Normalized dashboard shape for overview cards. */
export interface CctvOpsDashboard {
  activePermits: number;
  draftPermits: number;
  sharedPermitsToday: number;
  openReferrals: number;
  sentReferrals: number;
  inProgressReferrals: number;
  escalatedReferrals: number;
  resolvedToday: number;
  needsFollowUp: number;
  criticalOpen: number;
  recentReferrals: SecurityReferral[];
  recentPermits?: SecurityPermit[];
  delayedReferrals?: SecurityReferral[];
  availablePersonnel?: CctvUserBrief[];
  workingGroup?: { id: string; code: string; nameAr?: string } | null;
  currentShift?: {
    kind?: string;
    kindLabel?: { nameAr?: string };
    group?: { id: string; code: string; nameAr?: string } | null;
  };
}

export interface CctvOpsStatistics {
  permitsByStatus: Record<string, number>;
  referralsByStatus: Record<string, number>;
  referralsBySeverity: Record<string, number>;
  totalPermits?: number;
  totalReferrals?: number;
  averageAcknowledgeMinutes?: number | null;
  averageReceiveMinutes?: number | null;
  averageResolveMinutes?: number | null;
  closedRate?: number | null;
  escalatedRate?: number | null;
  escalationCount?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number };
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  permitType?: string;
  importance?: string;
  severity?: string;
  referralType?: string;
  assignedUserId?: string;
  needsFollowUp?: boolean;
  from?: string;
  to?: string;
}

export interface CreatePermitPayload {
  permitType: SecurityPermitType;
  title: string;
  holderName: string;
  nationalId?: string | null;
  employeeNumber?: string | null;
  companyName?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  hostName?: string | null;
  hostDepartment?: string | null;
  allowedZoneId?: string | null;
  allowedFloor?: string | null;
  validFrom: string;
  validTo: string;
  importance?: PermitImportance;
  notes?: string | null;
  attachment?: FileAttachmentPayload | null;
}

export interface FileAttachmentPayload {
  originalFileName: string;
  mimeType: string;
  contentBase64: string;
  attachmentType?: ReferralAttachmentType;
  description?: string | null;
}

export interface CreateReferralPayload {
  title: string;
  description: string;
  referralType: SecurityReferralType;
  severity?: SecurityReferralSeverity;
  zoneId?: string | null;
  checkpointId?: string | null;
  floorNumber?: number | null;
  cameraCode?: string | null;
  occurredAt?: string;
  assignedUserId?: string | null;
  assignedGroupId?: string | null;
  notes?: string | null;
  sendImmediately?: boolean;
  sendToSupervisor?: boolean;
  attachments?: FileAttachmentPayload[];
}

export interface ResolveReferralPayload {
  resolutionSummary: string;
  notes?: string | null;
  needsFollowUp?: boolean;
  attachment?: FileAttachmentPayload | null;
}

export const PERMIT_TYPE_LABELS: Record<SecurityPermitType, string> = {
  VISITOR: 'زائر',
  VEHICLE: 'مركبة',
  CONTRACTOR: 'مقاول',
  MAINTENANCE: 'صيانة',
  DELIVERY: 'توصيل',
  TEMPORARY_ACCESS: 'دخول مؤقت',
  VIP: 'VIP',
  OTHER: 'أخرى',
};

export const PERMIT_STATUS_LABELS: Record<SecurityPermitStatus, string> = {
  DRAFT: 'مسودة',
  ACTIVE: 'نشط',
  EXPIRED: 'منتهٍ',
  CANCELLED: 'ملغى',
  USED: 'مستخدم',
  REJECTED: 'مرفوض',
};

export const PERMIT_IMPORTANCE_LABELS: Record<PermitImportance, string> = {
  NORMAL: 'عادي',
  IMPORTANT: 'مهم',
  URGENT: 'عاجل',
};

export const PERMIT_SHARE_STATUS_LABELS: Record<PermitShareStatus, string> = {
  SENT: 'مُرسل',
  DELIVERED: 'مُسلَّم',
  VIEWED: 'تمت المشاهدة',
  ACKNOWLEDGED: 'تم الإقرار',
  FAILED: 'فشل',
};

export const REFERRAL_TYPE_LABELS: Record<SecurityReferralType, string> = {
  SUSPICIOUS_PERSON: 'شخص مشبوه',
  SUSPICIOUS_VEHICLE: 'مركبة مشبوهة',
  PARKING_VIOLATION: 'مخالفة موقف',
  UNAUTHORIZED_ACCESS: 'دخول غير مصرح',
  DOOR_OPEN: 'باب مفتوح',
  CROWDING: 'ازدحام',
  SAFETY_RISK: 'خطر سلامة',
  LOST_ITEM: 'مفقودات',
  PROPERTY_DAMAGE: 'إتلاف ممتلكات',
  SECURITY_OBSERVATION: 'ملاحظة أمنية',
  OTHER: 'أخرى',
};

export const REFERRAL_STATUS_LABELS: Record<SecurityReferralStatus, string> = {
  NEW: 'جديدة',
  SENT: 'مُرسلة',
  RECEIVED: 'مستلمة',
  IN_PROGRESS: 'قيد التحقق',
  RESOLVED: 'تمت المعالجة',
  CLOSED: 'مغلقة',
  REJECTED: 'مرفوضة',
  CANCELLED: 'ملغاة',
  ESCALATED: 'مُصعَّدة',
};

export const REFERRAL_SEVERITY_LABELS: Record<SecurityReferralSeverity, string> = {
  LOW: 'منخفضة',
  MEDIUM: 'متوسطة',
  HIGH: 'عالية',
  CRITICAL: 'حرجة',
};

/** @deprecated alias */
export const SEVERITY_LABELS = REFERRAL_SEVERITY_LABELS;

export const REFERRAL_UPDATE_TYPE_LABELS: Record<string, string> = {
  CREATED: 'إنشاء',
  SENT: 'إرسال',
  RECEIVED: 'استلام',
  STATUS_CHANGED: 'تغيير حالة',
  NOTE_ADDED: 'ملاحظة',
  ASSIGNED: 'إسناد',
  REASSIGNED: 'إعادة إسناد',
  ARRIVED: 'وصول',
  RESOLVED: 'حل',
  ESCALATED: 'تصعيد',
  REJECTED: 'رفض',
  CANCELLED: 'إلغاء',
  CLOSED: 'إغلاق',
  ATTACHMENT_ADDED: 'مرفق',
};
