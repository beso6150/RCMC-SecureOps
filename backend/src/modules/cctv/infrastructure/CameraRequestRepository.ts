import { CameraRequestStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
  cameraRequestInclude,
  CameraRequestListFilters,
  CameraRequestWithRelations,
  CompleteCameraRequestData,
  CreateCameraRequestData,
} from '../domain/types.js';

export class CameraRequestRepository {
  async create(data: CreateCameraRequestData): Promise<CameraRequestWithRelations> {
    return prisma.cameraRequest.create({
      data: {
        plateNumber: data.plateNumber.trim().toUpperCase(),
        notes: data.notes ?? null,
        requestedById: data.requestedById,
      },
      include: cameraRequestInclude,
    });
  }

  async findById(id: string): Promise<CameraRequestWithRelations | null> {
    return prisma.cameraRequest.findFirst({
      where: { id, deletedAt: null },
      include: cameraRequestInclude,
    });
  }

  async list(
    filters: CameraRequestListFilters,
  ): Promise<{ rows: CameraRequestWithRelations[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.CameraRequestWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.requestedById ? { requestedById: filters.requestedById } : {}),
      ...(filters.plateNumber
        ? { plateNumber: { contains: filters.plateNumber, mode: 'insensitive' } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.cameraRequest.count({ where }),
      prisma.cameraRequest.findMany({
        where,
        include: cameraRequestInclude,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total };
  }

  async update(
    id: string,
    data: Prisma.CameraRequestUpdateInput,
  ): Promise<CameraRequestWithRelations> {
    return prisma.cameraRequest.update({
      where: { id },
      data,
      include: cameraRequestInclude,
    });
  }

  async start(
    id: string,
    operatorId: string,
    startedAt: Date,
  ): Promise<CameraRequestWithRelations> {
    return this.update(id, {
      status: CameraRequestStatus.IN_PROGRESS,
      assignedOperator: { connect: { id: operatorId } },
      startedAt,
    });
  }

  async complete(
    id: string,
    data: CompleteCameraRequestData & { completedAt: Date; responseTimeMs: number },
  ): Promise<CameraRequestWithRelations> {
    return prisma.cameraRequest.update({
      where: { id },
      data: {
        status: CameraRequestStatus.COMPLETED,
        completedAt: data.completedAt,
        responseTimeMs: data.responseTimeMs,
        employeeName: data.employeeName ?? null,
        departmentName: data.departmentName ?? null,
        phone: data.phone ?? null,
        permitStatus: data.permitStatus ?? null,
        vehicleType: data.vehicleType ?? null,
        ownerName: data.ownerName ?? null,
        responseNotes: data.responseNotes ?? null,
        ...(data.permitId
          ? { permit: { connect: { id: data.permitId } } }
          : { permit: { disconnect: true } }),
      },
      include: cameraRequestInclude,
    });
  }

  async cancel(id: string): Promise<CameraRequestWithRelations> {
    return this.update(id, { status: CameraRequestStatus.CANCELLED });
  }

  async getAverageResponseMs(from: Date, to: Date): Promise<number | null> {
    const agg = await prisma.cameraRequest.aggregate({
      where: {
        deletedAt: null,
        status: CameraRequestStatus.COMPLETED,
        completedAt: { gte: from, lte: to },
        responseTimeMs: { not: null },
      },
      _avg: { responseTimeMs: true },
    });
    return agg._avg.responseTimeMs != null ? Math.round(agg._avg.responseTimeMs) : null;
  }

  async countPending(): Promise<number> {
    return prisma.cameraRequest.count({
      where: {
        deletedAt: null,
        status: { in: [CameraRequestStatus.PENDING, CameraRequestStatus.IN_PROGRESS] },
      },
    });
  }
}

export const cameraRequestRepository = new CameraRequestRepository();
