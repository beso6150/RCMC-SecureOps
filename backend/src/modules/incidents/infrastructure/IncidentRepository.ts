import { Prisma, IncidentStatus, UserStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  AddIncidentHistoryData,
  CreateIncidentData,
  IncidentListFilters,
  IncidentWithRelations,
  UpdateIncidentData,
  incidentInclude,
} from '../domain/types.js';

function toDecimal(value: number | null | undefined): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

export class IncidentRepository {
  async create(data: CreateIncidentData): Promise<IncidentWithRelations> {
    const { attachments, gpsLatitude, gpsLongitude, ...rest } = data;

    return prisma.incident.create({
      data: {
        ...rest,
        gpsLatitude: toDecimal(gpsLatitude) ?? null,
        gpsLongitude: toDecimal(gpsLongitude) ?? null,
        attachments: attachments?.length
          ? {
              create: attachments.map((a) => ({
                fileName: a.fileName,
                mimeType: a.mimeType,
                fileSize: a.fileSize,
                storageKey: a.storageKey,
                localPath: a.localPath ?? null,
              })),
            }
          : undefined,
      },
      include: incidentInclude,
    });
  }

  async findById(id: string): Promise<IncidentWithRelations | null> {
    return prisma.incident.findFirst({
      where: { id, deletedAt: null },
      include: incidentInclude,
    });
  }

  async findByClientSyncId(clientSyncId: string): Promise<IncidentWithRelations | null> {
    return prisma.incident.findFirst({
      where: { clientSyncId, deletedAt: null },
      include: incidentInclude,
    });
  }

  async list(
    filters: IncidentListFilters,
  ): Promise<{ rows: IncidentWithRelations[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.IncidentWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.typeId ? { typeId: filters.typeId } : {}),
      ...(filters.typeCode ? { type: { code: filters.typeCode } } : {}),
      ...(filters.parkingCode ? { parkingCode: filters.parkingCode } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.floorId ? { floorId: filters.floorId } : {}),
      ...(filters.meetingRoomId ? { meetingRoomId: filters.meetingRoomId } : {}),
      ...(filters.reporterId ? { reporterId: filters.reporterId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(filters.supervisorId ? { supervisorId: filters.supervisorId } : {}),
      ...(filters.opsManagerId ? { opsManagerId: filters.opsManagerId } : {}),
      ...(filters.from || filters.to
        ? {
            occurredAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
              { notes: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.incident.count({ where }),
      prisma.incident.findMany({
        where,
        include: incidentInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total };
  }

  async update(id: string, data: UpdateIncidentData): Promise<IncidentWithRelations> {
    const { gpsLatitude, gpsLongitude, ...rest } = data;

    return prisma.incident.update({
      where: { id },
      data: {
        ...rest,
        ...(gpsLatitude !== undefined ? { gpsLatitude: toDecimal(gpsLatitude) } : {}),
        ...(gpsLongitude !== undefined ? { gpsLongitude: toDecimal(gpsLongitude) } : {}),
      },
      include: incidentInclude,
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.incident.update({
      where: { id },
      data: { deletedAt: new Date(), status: IncidentStatus.CANCELLED },
    });
  }

  async findChangedSince(since: Date): Promise<IncidentWithRelations[]> {
    return prisma.incident.findMany({
      where: {
        OR: [{ updatedAt: { gt: since } }, { deletedAt: { gt: since } }],
      },
      include: incidentInclude,
      orderBy: { updatedAt: 'asc' },
      take: 500,
    });
  }

  async listTypes() {
    return prisma.incidentType.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findTypeByCode(code: string) {
    return prisma.incidentType.findFirst({
      where: { code, deletedAt: null, isActive: true },
    });
  }

  async findTypeById(id: string) {
    return prisma.incidentType.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async createType(data: {
    code: string;
    nameAr: string;
    nameEn: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return prisma.incidentType.create({
      data: {
        code: data.code.trim().toUpperCase(),
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn.trim(),
        description: data.description ?? null,
        sortOrder: data.sortOrder ?? 100,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateType(
    id: string,
    data: {
      code?: string;
      nameAr?: string;
      nameEn?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return prisma.incidentType.update({
      where: { id },
      data: {
        ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
        ...(data.nameAr !== undefined ? { nameAr: data.nameAr.trim() } : {}),
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  async addComment(incidentId: string, authorId: string, body: string) {
    return prisma.incidentComment.create({
      data: { incidentId, authorId, body },
      include: {
        author: { select: { id: true, fullName: true, employeeNumber: true } },
      },
    });
  }

  async addHistory(data: AddIncidentHistoryData) {
    return prisma.incidentHistory.create({ data });
  }

  async addAttachments(
    incidentId: string,
    attachments: NonNullable<CreateIncidentData['attachments']>,
  ): Promise<IncidentWithRelations> {
    await prisma.incidentAttachment.createMany({
      data: attachments.map((a) => ({
        incidentId,
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        storageKey: a.storageKey,
        localPath: a.localPath ?? null,
      })),
    });

    const updated = await this.findById(incidentId);
    if (!updated) {
      throw new Error('Incident not found after attaching files');
    }
    return updated;
  }

  async findAvailableAssignee(
    roleCode:
      | typeof RoleCodes.SECURITY_SUPERVISOR
      | typeof RoleCodes.OPERATIONS_MANAGER,
    groupId?: string | null,
  ): Promise<{ id: string } | null> {
    const baseWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      status: UserStatus.ACTIVE,
      role: { code: roleCode, deletedAt: null },
      ...(groupId ? { groupId } : {}),
    };

    const user = await prisma.user.findFirst({
      where: baseWhere,
      orderBy: { lastLoginAt: 'desc' },
      select: { id: true },
    });

    if (user) return user;

    return prisma.user.findFirst({
      where: {
        ...baseWhere,
        status: { in: [UserStatus.ACTIVE, UserStatus.PENDING_FIRST_LOGIN] },
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
    incidentId: string;
    actorId: string;
    metricKey: string;
    startedAt?: Date;
  }) {
    return prisma.responseTime.create({
      data: {
        incidentId: input.incidentId,
        actorId: input.actorId,
        metricKey: input.metricKey,
        startedAt: input.startedAt ?? new Date(),
      },
    });
  }

  async closeOpenResponseTimes(incidentId: string, endedAt: Date, actorId?: string) {
    const open = await prisma.responseTime.findMany({
      where: { incidentId, endedAt: null },
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
      incidentId: { not: null },
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
}

export const incidentRepository = new IncidentRepository();
