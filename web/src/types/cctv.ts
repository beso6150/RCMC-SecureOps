export type VehicleViolationStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'CANCELLED';

export type ViolationType =
  | 'ILLEGAL_PARKING'
  | 'NO_PERMIT'
  | 'EXPIRED_PERMIT'
  | 'BLOCKING'
  | 'UNAUTHORIZED_ZONE'
  | 'OTHER';

export type ParkingLocationCode = 'GROUND_PARKING' | 'BASEMENT_PARKING' | 'WEST_PARKING';

export type IncidentStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CameraRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type VisitStatus =
  | 'UPCOMING'
  | 'ARRIVED'
  | 'HOST_NOTIFIED'
  | 'IN_MEETING'
  | 'COMPLETED'
  | 'CANCELLED';

export type VisitImportance = 'NORMAL' | 'VIP' | 'VVIP';

export type TimelineItemType = 'incident' | 'violation' | 'camera_request' | 'visitor';

export interface UserRef {
  id: string;
  fullName: string;
  employeeNumber: string;
  email?: string;
}

export interface LocationRef {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface CctvDashboardStats {
  averageResponseMs: number | null;
  violationsToday: number;
  incidentsToday: number;
  visitorsToday: number;
}

export interface CctvTimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  createdAt: string;
  priority?: string;
}

export interface CctvDashboard {
  newIncidents: number;
  openViolations: number;
  currentVisitors: number;
  pendingCameraRequests: number;
  criticalIncidents: number;
  stats: CctvDashboardStats;
  timeline: CctvTimelineItem[];
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface ViolationAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  imagePath?: string | null;
  sortOrder?: number;
  createdAt?: string;
}

export interface Violation {
  id: string;
  plateNumber: string;
  violationType: ViolationType;
  parkingCode: ParkingLocationCode;
  status: VehicleViolationStatus;
  notes: string | null;
  createdAt: string;
  detectedAt: string;
  closedAt: string | null;
  location: LocationRef;
  createdBy: UserRef & { roleId: string };
  supervisor: UserRef | null;
  cctvOperator: UserRef | null;
  imagePath?: string | null;
  gpsLatitude?: number | string | null;
  gpsLongitude?: number | string | null;
  attachments?: ViolationAttachment[];
}

export interface IncidentType {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
  type: IncidentType;
  reporter: UserRef & { roleId: string };
  assignee: UserRef | null;
  supervisor: UserRef | null;
  opsManager: UserRef | null;
  /** Sprint 15 optional field-ops location fields */
  floorId?: string | null;
  zoneId?: string | null;
  checkpointId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  floor?: { id: string; nameAr?: string; nameEn?: string; number?: number } | null;
  zone?: { id: string; name: string; code: string } | null;
  checkpoint?: { id: string; name: string; code: string } | null;
}

export interface Visitor {
  id: string;
  visitorName: string;
  status: VisitStatus;
  importance: VisitImportance;
  visitDate: string;
  arrivalTime: string | null;
  createdAt: string;
  organization: string | null;
  purpose?: string | null;
  mobile?: string | null;
  host?: {
    employeeName: string;
    department?: { nameAr: string } | null;
  };
}

export interface VehiclePermitSearchResult {
  id: string;
  plateNumber: string;
  vehicleType: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  employeeName: string | null;
  employeePhone: string | null;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  location: LocationRef | null;
}

export interface CameraRequest {
  id: string;
  plateNumber: string;
  status: CameraRequestStatus;
  notes: string | null;
  employeeName: string | null;
  departmentName: string | null;
  phone: string | null;
  permitStatus: string | null;
  vehicleType: string | null;
  ownerName: string | null;
  responseNotes: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  responseTimeMs: number | null;
  requestedBy: UserRef;
  assignedOperator: UserRef | null;
  permit: {
    id: string;
    plateNumber: string;
    status: string;
    vehicleType: string | null;
    ownerName: string | null;
    ownerPhone: string | null;
  } | null;
}

export interface CreateCameraRequestPayload {
  plateNumber: string;
  notes?: string | null;
}

export interface CompleteCameraRequestPayload {
  employeeName?: string | null;
  departmentName?: string | null;
  phone?: string | null;
  permitStatus?: string | null;
  vehicleType?: string | null;
  ownerName?: string | null;
  permitId?: string | null;
  responseNotes?: string | null;
}

export interface ListViolationsParams {
  page?: number;
  pageSize?: number;
  status?: VehicleViolationStatus;
  search?: string;
}

export interface ListIncidentsParams {
  page?: number;
  pageSize?: number;
  status?: IncidentStatus;
  typeCode?: string;
  search?: string;
}

export interface ListVisitorsParams {
  page?: number;
  pageSize?: number;
  status?: VisitStatus;
}

export interface ListCameraRequestsParams {
  page?: number;
  pageSize?: number;
  status?: CameraRequestStatus;
  plateNumber?: string;
}
