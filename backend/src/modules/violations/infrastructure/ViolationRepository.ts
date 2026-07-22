import { Prisma, VehicleViolationStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  CreateViolationData,
  UpdateViolationData,
  ViolationListFilters,
  ViolationWithRelations,
  violationInclude,
} from '../domain/types.js';

function toDecimal(value: number | null | undefined): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

export class ViolationRepository {
  async create(data: CreateViolationData): Promise<ViolationWithRelations> {
    const { attachments, gpsLatitude, gpsLongitude, ...rest } = data;

    return prisma.vehicleViolation.create({
      data: {
        ...rest,
        gpsLatitude: toDecimal(gpsLatitude) ?? null,
        gpsLongitude: toDecimal(gpsLongitude) ?? null,
        attachments: attachments?.length
          ? {
              create: attachments.map((a, index) => ({
                fileName: a.fileName,
                mimeType: a.mimeType,
                fileSize: a.fileSize,
                storageKey: a.storageKey,
                imagePath: a.imagePath ?? null,
                sortOrder: a.sortOrder ?? index,
              })),
            }
          : undefined,
      },
      include: violationInclude,
    });
  }

  async findById(id: string): Promise<ViolationWithRelations | null> {
    return prisma.vehicleViolation.findFirst({
      where: { id, deletedAt: null },
      include: violationInclude,
    });
  }

  async findByClientSyncId(clientSyncId: string): Promise<ViolationWithRelations | null> {
    return prisma.vehicleViolation.findFirst({
      where: { clientSyncId, deletedAt: null },
      include: violationInclude,
    });
  }

  async list(
    filters: ViolationListFilters,
  ): Promise<{ rows: ViolationWithRelations[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.VehicleViolationWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.parkingCode ? { parkingCode: filters.parkingCode } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.createdById ? { createdById: filters.createdById } : {}),
      ...(filters.supervisorId ? { supervisorId: filters.supervisorId } : {}),
      ...(filters.cctvOperatorId ? { cctvOperatorId: filters.cctvOperatorId } : {}),
      ...(filters.violationType ? { violationType: filters.violationType } : {}),
      ...(filters.plateNumber
        ? { plateNumber: { contains: filters.plateNumber, mode: 'insensitive' } }
        : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { plateNumber: { contains: filters.search, mode: 'insensitive' } },
              { arabicPlate: { contains: filters.search, mode: 'insensitive' } },
              { englishPlate: { contains: filters.search, mode: 'insensitive' } },
              { ocrResult: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.vehicleViolation.count({ where }),
      prisma.vehicleViolation.findMany({
        where,
        include: violationInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total };
  }

  async update(id: string, data: UpdateViolationData): Promise<ViolationWithRelations> {
    const { gpsLatitude, gpsLongitude, ...rest } = data;

    return prisma.vehicleViolation.update({
      where: { id },
      data: {
        ...rest,
        ...(gpsLatitude !== undefined ? { gpsLatitude: toDecimal(gpsLatitude) } : {}),
        ...(gpsLongitude !== undefined ? { gpsLongitude: toDecimal(gpsLongitude) } : {}),
      },
      include: violationInclude,
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.vehicleViolation.update({
      where: { id },
      data: { deletedAt: new Date(), status: VehicleViolationStatus.CANCELLED },
    });
  }

  async findChangedSince(since: Date): Promise<ViolationWithRelations[]> {
    return prisma.vehicleViolation.findMany({
      where: {
        OR: [{ updatedAt: { gt: since } }, { deletedAt: { gt: since } }],
      },
      include: violationInclude,
      orderBy: { updatedAt: 'asc' },
      take: 500,
    });
  }

  async addAttachments(
    violationId: string,
    attachments: NonNullable<CreateViolationData['attachments']>,
  ): Promise<ViolationWithRelations> {
    await prisma.violationAttachment.createMany({
      data: attachments.map((a, index) => ({
        violationId,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        storageKey: a.storageKey,
        imagePath: a.imagePath ?? null,
        sortOrder: a.sortOrder ?? index,
      })),
    });

    const updated = await this.findById(violationId);
    if (!updated) {
      throw new Error('Violation not found after attaching images');
    }
    return updated;
  }

  async findAvailableAssignee(
    roleCode: typeof RoleCodes.SECURITY_SUPERVISOR | typeof RoleCodes.CCTV_OPERATOR,
  ): Promise<{ id: string } | null> {
    const user = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        role: { code: roleCode, deletedAt: null },
      },
      orderBy: { lastLoginAt: 'desc' },
      select: { id: true },
    });

    // Fallback: allow PENDING_FIRST_LOGIN supervisors/operators for early environments
    if (user) return user;

    return prisma.user.findFirst({
      where: {
        deletedAt: null,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
        role: { code: roleCode, deletedAt: null },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
  }

  async getLocationByParkingCode(parkingCode: string) {
    return prisma.location.findFirst({
      where: { code: parkingCode, deletedAt: null },
    });
  }

  async startResponseTime(input: {
    violationId: string;
    actorId: string;
    metricKey: string;
    startedAt?: Date;
  }) {
    return prisma.responseTime.create({
      data: {
        violationId: input.violationId,
        actorId: input.actorId,
        metricKey: input.metricKey,
        startedAt: input.startedAt ?? new Date(),
      },
    });
  }

  async closeOpenResponseTimes(violationId: string, endedAt: Date, actorId?: string) {
    const open = await prisma.responseTime.findMany({
      where: { violationId, endedAt: null },
    });

    for (const row of open) {
      const durationMs = Math.max(0, endedAt.getTime() - row.startedAt.getTime());
      await prisma.responseTime.update({
        where: { id: row.id },
        data: {
          endedAt,
          durationMs,
          ...(actorId ? { actorId } : {}),
        },
      });
    }

    return open.length;
  }

  async getAverageResponseMs(from?: Date, to?: Date): Promise<number | null> {
    const where: Prisma.ResponseTimeWhereInput = {
      violationId: { not: null },
      durationMs: { not: null },
      ...(from || to
        ? {
            endedAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const agg = await prisma.responseTime.aggregate({
      where,
      _avg: { durationMs: true },
    });

    return agg._avg.durationMs ?? null;
  }

  async countByDay(from: Date, to: Date) {
    const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM vehicle_violations
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({ day: r.day, count: Number(r.count) }));
  }

  async countByMonth(from: Date, to: Date) {
    const rows = await prisma.$queryRaw<Array<{ month: Date; count: bigint }>>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
      FROM vehicle_violations
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({ month: r.month, count: Number(r.count) }));
  }

  async countByLocation(from?: Date, to?: Date) {
    const rows = await prisma.vehicleViolation.groupBy({
      by: ['locationId', 'parkingCode'],
      where: {
        deletedAt: null,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      _count: { _all: true },
    });

    const locationIds = rows.map((r) => r.locationId);
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, code: true, nameEn: true, nameAr: true },
    });
    const map = new Map(locations.map((l) => [l.id, l]));

    return rows.map((r) => ({
      locationId: r.locationId,
      parkingCode: r.parkingCode,
      location: map.get(r.locationId) ?? null,
      count: r._count._all,
    }));
  }

  async countByUser(from?: Date, to?: Date) {
    const rows = await prisma.vehicleViolation.groupBy({
      by: ['createdById'],
      where: {
        deletedAt: null,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      _count: { _all: true },
    });

    const userIds = rows.map((r) => r.createdById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, employeeNumber: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => ({
      userId: r.createdById,
      user: map.get(r.createdById) ?? null,
      count: r._count._all,
    }));
  }
}

export const violationRepository = new ViolationRepository();
