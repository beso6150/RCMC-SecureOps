import {
  HostCommunicationPreference,
  Prisma,
  VisitImportance,
  VisitStatus,
} from '@prisma/client';

export const visitorInclude = {
  host: {
    include: {
      department: { select: { id: true, code: true, nameEn: true, nameAr: true } },
    },
  },
  floor: { select: { id: true, code: true, nameEn: true, nameAr: true, level: true } },
  meetingRoom: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  location: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  history: { orderBy: { createdAt: 'desc' as const }, take: 50 },
  notifications: { orderBy: { createdAt: 'desc' as const }, take: 50 },
} satisfies Prisma.VisitorInclude;

export type VisitorWithRelations = Prisma.VisitorGetPayload<{ include: typeof visitorInclude }>;

export const hostInclude = {
  department: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  user: { select: { id: true, fullName: true, employeeNumber: true, email: true } },
  _count: { select: { visitors: true } },
} satisfies Prisma.HostInclude;

export type HostWithRelations = Prisma.HostGetPayload<{ include: typeof hostInclude }>;

export interface VisitorListFilters {
  page?: number;
  pageSize?: number;
  status?: VisitStatus;
  importance?: VisitImportance;
  hostId?: string;
  floorId?: string;
  meetingRoomId?: string;
  departmentId?: string;
  visitDate?: Date;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface CreateHostInput {
  employeeNumber: string;
  employeeName: string;
  departmentId?: string | null;
  phone?: string | null;
  email?: string | null;
  userId?: string | null;
  communicationPreference?: HostCommunicationPreference;
  whatsappEnabled?: boolean;
  phoneCallEnabled?: boolean;
}

export interface CreateVisitorInput {
  visitorName: string;
  nationalId?: string | null;
  organization?: string | null;
  mobile?: string | null;
  vehiclePlate?: string | null;
  visitDate: Date;
  arrivalTime?: Date | null;
  departureTime?: Date | null;
  importance?: VisitImportance;
  purpose?: string | null;
  hostId: string;
  floorId?: string | null;
  meetingRoomId?: string | null;
  locationId?: string | null;
  badgeNumber?: string | null;
}
