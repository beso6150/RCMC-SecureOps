import { Prisma } from '@prisma/client';

export const complaintInclude = {
  location: { select: { id: true, code: true, nameEn: true, nameAr: true } },
  submitter: { select: { id: true, fullName: true, employeeNumber: true } },
  reviewer: { select: { id: true, fullName: true, employeeNumber: true } },
} as const;

export type ComplaintWithRelations = Prisma.ComplaintGetPayload<{
  include: typeof complaintInclude;
}>;

export interface ComplaintListFilters {
  page?: number;
  pageSize?: number;
  status?: Prisma.EnumComplaintStatusFilter['equals'];
  search?: string;
  from?: Date;
  to?: Date;
}

export interface CreateComplaintData {
  title: string;
  description: string;
  locationId?: string | null;
  submitterId: string;
}

export interface UpdateComplaintData {
  title?: string;
  description?: string;
}
