import {
  ParkingLocationCode,
  Prisma,
  VehicleViolation,
  VehicleViolationStatus,
  ViolationType,
} from '@prisma/client';

export interface CreateViolationData {
  plateNumber: string;
  ocrResult?: string | null;
  ocrConfidence?: number | null;
  arabicPlate?: string | null;
  englishPlate?: string | null;
  vehicleColor?: string | null;
  violationType: ViolationType;
  parkingCode: ParkingLocationCode;
  locationId: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  imagePath?: string | null;
  createdById: string;
  supervisorId?: string | null;
  cctvOperatorId?: string | null;
  status?: VehicleViolationStatus;
  notes?: string | null;
  clientSyncId?: string | null;
  detectedAt?: Date;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    fileSize: number;
    storageKey: string;
    imagePath?: string | null;
    sortOrder?: number;
  }>;
}

export interface UpdateViolationData {
  plateNumber?: string;
  ocrResult?: string | null;
  ocrConfidence?: number | null;
  arabicPlate?: string | null;
  englishPlate?: string | null;
  vehicleColor?: string | null;
  violationType?: ViolationType;
  parkingCode?: ParkingLocationCode;
  locationId?: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  imagePath?: string | null;
  supervisorId?: string | null;
  cctvOperatorId?: string | null;
  status?: VehicleViolationStatus;
  closedAt?: Date | null;
  notes?: string | null;
}

export interface ViolationListFilters {
  page?: number;
  pageSize?: number;
  status?: VehicleViolationStatus;
  parkingCode?: ParkingLocationCode;
  locationId?: string;
  createdById?: string;
  supervisorId?: string;
  cctvOperatorId?: string;
  violationType?: ViolationType;
  plateNumber?: string;
  from?: Date;
  to?: Date;
  search?: string;
}

export type ViolationWithRelations = Prisma.VehicleViolationGetPayload<{
  include: {
    location: true;
    createdBy: { select: { id: true; fullName: true; employeeNumber: true; roleId: true } };
    supervisor: { select: { id: true; fullName: true; employeeNumber: true } };
    cctvOperator: { select: { id: true; fullName: true; employeeNumber: true } };
    attachments: true;
    responseTimes: true;
  };
}>;

export const violationInclude = {
  location: true,
  createdBy: { select: { id: true, fullName: true, employeeNumber: true, roleId: true } },
  supervisor: { select: { id: true, fullName: true, employeeNumber: true } },
  cctvOperator: { select: { id: true, fullName: true, employeeNumber: true } },
  attachments: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
  },
  responseTimes: {
    orderBy: { startedAt: 'asc' as const },
  },
} satisfies Prisma.VehicleViolationInclude;

export type { VehicleViolation };
