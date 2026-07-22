import { Prisma } from '@prisma/client';

export const cameraRequestInclude = {
  requestedBy: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
      email: true,
    },
  },
  assignedOperator: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
      email: true,
    },
  },
  permit: {
    select: {
      id: true,
      plateNumber: true,
      status: true,
      vehicleType: true,
      ownerName: true,
      ownerPhone: true,
      validFrom: true,
      validTo: true,
    },
  },
} satisfies Prisma.CameraRequestInclude;

export type CameraRequestWithRelations = Prisma.CameraRequestGetPayload<{
  include: typeof cameraRequestInclude;
}>;

export interface CameraRequestListFilters {
  page?: number;
  pageSize?: number;
  status?: import('@prisma/client').CameraRequestStatus;
  mine?: boolean;
  requestedById?: string;
  plateNumber?: string;
}

export interface CreateCameraRequestData {
  plateNumber: string;
  notes?: string | null;
  requestedById: string;
}

export interface CompleteCameraRequestData {
  employeeName?: string | null;
  departmentName?: string | null;
  phone?: string | null;
  permitStatus?: string | null;
  vehicleType?: string | null;
  ownerName?: string | null;
  permitId?: string | null;
  responseNotes?: string | null;
}

export const vehiclePermitInclude = {
  location: {
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameAr: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
    },
  },
} satisfies Prisma.VehiclePermitInclude;

export type VehiclePermitWithRelations = Prisma.VehiclePermitGetPayload<{
  include: typeof vehiclePermitInclude;
}>;
