import {
  HostCommunicationPreference,
  Prisma,
  VisitHistoryAction,
  VisitImportance,
  VisitStatus,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
  CreateHostInput,
  CreateVisitorInput,
  HostWithRelations,
  VisitorListFilters,
  VisitorWithRelations,
  hostInclude,
  visitorInclude,
} from '../domain/types.js';

export class VisitorRepository {
  async createVisitor(
    data: CreateVisitorInput & { hostUserId?: string | null; status?: VisitStatus },
  ): Promise<VisitorWithRelations> {
    return prisma.visitor.create({
      data: {
        visitorName: data.visitorName,
        nationalId: data.nationalId ?? null,
        organization: data.organization ?? null,
        mobile: data.mobile ?? null,
        vehiclePlate: data.vehiclePlate ?? null,
        visitDate: data.visitDate,
        arrivalTime: data.arrivalTime ?? null,
        departureTime: data.departureTime ?? null,
        importance: data.importance ?? VisitImportance.NORMAL,
        purpose: data.purpose ?? null,
        hostId: data.hostId,
        hostUserId: data.hostUserId ?? null,
        floorId: data.floorId ?? null,
        meetingRoomId: data.meetingRoomId ?? null,
        locationId: data.locationId ?? null,
        badgeNumber: data.badgeNumber ?? null,
        status: data.status ?? VisitStatus.UPCOMING,
      },
      include: visitorInclude,
    });
  }

  async findVisitorById(id: string): Promise<VisitorWithRelations | null> {
    return prisma.visitor.findFirst({
      where: { id, deletedAt: null },
      include: visitorInclude,
    });
  }

  async listVisitors(
    filters: VisitorListFilters,
  ): Promise<{ rows: VisitorWithRelations[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.VisitorWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.importance ? { importance: filters.importance } : {}),
      ...(filters.hostId ? { hostId: filters.hostId } : {}),
      ...(filters.floorId ? { floorId: filters.floorId } : {}),
      ...(filters.meetingRoomId ? { meetingRoomId: filters.meetingRoomId } : {}),
      ...(filters.departmentId ? { host: { departmentId: filters.departmentId } } : {}),
      ...(filters.visitDate ? { visitDate: filters.visitDate } : {}),
      ...(filters.from || filters.to
        ? {
            visitDate: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { visitorName: { contains: filters.search, mode: 'insensitive' } },
              { nationalId: { contains: filters.search } },
              { organization: { contains: filters.search, mode: 'insensitive' } },
              { mobile: { contains: filters.search } },
              { vehiclePlate: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.visitor.count({ where }),
      prisma.visitor.findMany({
        where,
        include: visitorInclude,
        orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total };
  }

  async updateVisitor(
    id: string,
    data: Prisma.VisitorUpdateInput,
  ): Promise<VisitorWithRelations> {
    return prisma.visitor.update({
      where: { id },
      data,
      include: visitorInclude,
    });
  }

  async softDeleteVisitor(id: string): Promise<void> {
    await prisma.visitor.update({
      where: { id },
      data: { deletedAt: new Date(), status: VisitStatus.CANCELLED },
    });
  }

  async addHistory(entry: {
    visitorId: string;
    action: VisitHistoryAction;
    actorId?: string | null;
    fromStatus?: VisitStatus | null;
    toStatus?: VisitStatus | null;
    notes?: string | null;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.visitHistory.create({
      data: {
        visitorId: entry.visitorId,
        action: entry.action,
        actorId: entry.actorId ?? null,
        fromStatus: entry.fromStatus ?? null,
        toStatus: entry.toStatus ?? null,
        notes: entry.notes ?? null,
        metadata: entry.metadata ?? undefined,
      },
    });
  }

  async listHistory(visitorId: string) {
    return prisma.visitHistory.findMany({
      where: { visitorId },
      include: {
        actor: { select: { id: true, fullName: true, employeeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNotification(data: Prisma.VisitNotificationCreateInput) {
    return prisma.visitNotification.create({ data });
  }

  async listNotifications(visitorId: string) {
    return prisma.visitNotification.findMany({
      where: { visitorId },
      include: {
        recipient: { select: { id: true, fullName: true, employeeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUsersByRoleCodes(roleCodes: string[]) {
    return prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { code: { in: roleCodes }, deletedAt: null },
      },
      select: {
        id: true,
        fullName: true,
        employeeNumber: true,
        role: { select: { code: true } },
      },
    });
  }

  // ── Hosts ─────────────────────────────────────────────────────

  async createHost(data: CreateHostInput): Promise<HostWithRelations> {
    return prisma.host.create({
      data: {
        employeeNumber: data.employeeNumber,
        employeeName: data.employeeName,
        departmentId: data.departmentId ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        userId: data.userId ?? null,
        communicationPreference: data.communicationPreference ?? HostCommunicationPreference.WHATSAPP,
        whatsappEnabled: data.whatsappEnabled ?? true,
        phoneCallEnabled: data.phoneCallEnabled ?? false,
      },
      include: hostInclude,
    });
  }

  async findHostById(id: string): Promise<HostWithRelations | null> {
    return prisma.host.findFirst({
      where: { id, deletedAt: null },
      include: hostInclude,
    });
  }

  async listHosts(search?: string): Promise<HostWithRelations[]> {
    return prisma.host.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { employeeName: { contains: search, mode: 'insensitive' } },
                { employeeNumber: { contains: search } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      include: hostInclude,
      orderBy: { employeeName: 'asc' },
    });
  }

  async updateHost(id: string, data: Prisma.HostUpdateInput): Promise<HostWithRelations> {
    return prisma.host.update({
      where: { id },
      data,
      include: hostInclude,
    });
  }

  async softDeleteHost(id: string): Promise<void> {
    await prisma.host.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Floors & meeting rooms ────────────────────────────────────

  async listFloors() {
    return prisma.floor.findMany({
      where: { deletedAt: null },
      include: {
        building: { select: { id: true, code: true, nameEn: true, nameAr: true } },
        meetingRooms: { where: { deletedAt: null }, orderBy: { code: 'asc' } },
        _count: { select: { meetingRooms: true, visitors: true } },
      },
      orderBy: [{ buildingId: 'asc' }, { level: 'asc' }],
    });
  }

  async findFloorById(id: string) {
    return prisma.floor.findFirst({
      where: { id, deletedAt: null },
      include: {
        building: true,
        meetingRooms: { where: { deletedAt: null }, orderBy: { code: 'asc' } },
      },
    });
  }

  async updateFloor(id: string, data: Prisma.FloorUpdateInput) {
    return prisma.floor.update({ where: { id }, data });
  }

  async listMeetingRooms(floorId?: string) {
    return prisma.meetingRoom.findMany({
      where: {
        deletedAt: null,
        ...(floorId ? { floorId } : {}),
      },
      include: {
        floor: { select: { id: true, code: true, nameEn: true, nameAr: true, level: true } },
      },
      orderBy: [{ floorId: 'asc' }, { code: 'asc' }],
    });
  }

  async findMeetingRoomById(id: string) {
    return prisma.meetingRoom.findFirst({
      where: { id, deletedAt: null },
      include: { floor: true },
    });
  }

  async createMeetingRoom(data: {
    floorId: string;
    code: string;
    nameEn: string;
    nameAr: string;
    capacity?: number | null;
    isActive?: boolean;
  }) {
    return prisma.meetingRoom.create({
      data: {
        floorId: data.floorId,
        code: data.code,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        capacity: data.capacity ?? null,
        isActive: data.isActive ?? true,
      },
      include: { floor: true },
    });
  }

  async updateMeetingRoom(id: string, data: Prisma.MeetingRoomUpdateInput) {
    return prisma.meetingRoom.update({
      where: { id },
      data,
      include: { floor: true },
    });
  }

  async softDeleteMeetingRoom(id: string) {
    await prisma.meetingRoom.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ── Email ingest ──────────────────────────────────────────────

  async createEmailIngest(data: {
    subject: string;
    body: string;
    receivedAt: Date;
    senderDomain: string;
    senderEmail?: string | null;
    visitorId?: string | null;
    rawHeaders?: Prisma.InputJsonValue;
  }) {
    return prisma.visitEmailIngest.create({
      data: {
        subject: data.subject,
        body: data.body,
        receivedAt: data.receivedAt,
        senderDomain: data.senderDomain,
        senderEmail: data.senderEmail ?? null,
        visitorId: data.visitorId ?? null,
        rawHeaders: data.rawHeaders ?? undefined,
      },
    });
  }

  async listEmailIngests(parseStatus?: string) {
    return prisma.visitEmailIngest.findMany({
      where: parseStatus ? { parseStatus: parseStatus as never } : undefined,
      include: {
        visitor: { select: { id: true, visitorName: true, status: true } },
      },
      orderBy: { receivedAt: 'desc' },
      take: 200,
    });
  }

  // ── Statistics helpers ────────────────────────────────────────

  async countToday(dayStart: Date, dayEnd: Date) {
    return prisma.visitor.count({
      where: {
        deletedAt: null,
        visitDate: { gte: dayStart, lte: dayEnd },
        status: { not: VisitStatus.CANCELLED },
      },
    });
  }

  async countByDepartment(from: Date, to: Date) {
    const rows = await prisma.visitor.findMany({
      where: {
        deletedAt: null,
        visitDate: { gte: from, lte: to },
        status: { not: VisitStatus.CANCELLED },
      },
      select: {
        host: {
          select: {
            departmentId: true,
            department: { select: { id: true, code: true, nameEn: true, nameAr: true } },
          },
        },
      },
    });

    const map = new Map<string, { department: unknown; count: number }>();
    for (const row of rows) {
      const key = row.host.departmentId ?? 'unassigned';
      const current = map.get(key) ?? { department: row.host.department, count: 0 };
      current.count += 1;
      map.set(key, current);
    }
    return Array.from(map.entries()).map(([departmentId, v]) => ({
      departmentId: departmentId === 'unassigned' ? null : departmentId,
      department: v.department,
      count: v.count,
    }));
  }

  async countByFloor(from: Date, to: Date) {
    const rows = await prisma.visitor.groupBy({
      by: ['floorId'],
      where: {
        deletedAt: null,
        visitDate: { gte: from, lte: to },
        status: { not: VisitStatus.CANCELLED },
      },
      _count: { _all: true },
    });

    const floorIds = rows.map((r) => r.floorId).filter((id): id is string => Boolean(id));
    const floors = await prisma.floor.findMany({
      where: { id: { in: floorIds } },
      select: { id: true, code: true, nameEn: true, nameAr: true, level: true },
    });
    const floorMap = new Map(floors.map((f) => [f.id, f]));

    return rows.map((r) => ({
      floorId: r.floorId,
      floor: r.floorId ? floorMap.get(r.floorId) ?? null : null,
      count: r._count._all,
    }));
  }

  async countByImportance(from: Date, to: Date) {
    return prisma.visitor.groupBy({
      by: ['importance'],
      where: {
        deletedAt: null,
        visitDate: { gte: from, lte: to },
        status: { not: VisitStatus.CANCELLED },
      },
      _count: { _all: true },
    });
  }

  async averageHostResponseMs(from: Date, to: Date): Promise<number | null> {
    const rows = await prisma.visitor.findMany({
      where: {
        deletedAt: null,
        visitDate: { gte: from, lte: to },
        hostNotifiedAt: { not: null },
        hostRespondedAt: { not: null },
      },
      select: { hostNotifiedAt: true, hostRespondedAt: true },
    });

    if (rows.length === 0) return null;

    const total = rows.reduce((sum, r) => {
      const start = r.hostNotifiedAt!.getTime();
      const end = r.hostRespondedAt!.getTime();
      return sum + Math.max(0, end - start);
    }, 0);

    return total / rows.length;
  }
}

export const visitorRepository = new VisitorRepository();
