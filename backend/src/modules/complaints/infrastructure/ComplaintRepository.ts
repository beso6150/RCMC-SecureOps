import { ComplaintStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
  ComplaintListFilters,
  ComplaintWithRelations,
  CreateComplaintData,
  UpdateComplaintData,
  complaintInclude,
} from '../domain/types.js';

export class ComplaintRepository {
  async create(data: CreateComplaintData): Promise<ComplaintWithRelations> {
    return prisma.complaint.create({
      data: {
        title: data.title,
        description: data.description,
        locationId: data.locationId ?? null,
        submitterId: data.submitterId,
        status: ComplaintStatus.SUBMITTED,
      },
      include: complaintInclude,
    });
  }

  async findById(id: string): Promise<ComplaintWithRelations | null> {
    return prisma.complaint.findFirst({
      where: { id, deletedAt: null },
      include: complaintInclude,
    });
  }

  async list(
    filters: ComplaintListFilters,
  ): Promise<{ rows: ComplaintWithRelations[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.ComplaintWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
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
              { title: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        include: complaintInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { rows, total };
  }

  async update(id: string, data: UpdateComplaintData): Promise<ComplaintWithRelations> {
    return prisma.complaint.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
      include: complaintInclude,
    });
  }

  async review(
    id: string,
    data: {
      status: ComplaintStatus;
      reviewerId: string;
      reviewNotes?: string | null;
    },
  ): Promise<ComplaintWithRelations> {
    return prisma.complaint.update({
      where: { id },
      data: {
        status: data.status,
        reviewerId: data.reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes ?? null,
      },
      include: complaintInclude,
    });
  }

  async countByStatus(from?: Date, to?: Date) {
    const where: Prisma.ComplaintWhereInput = {
      deletedAt: null,
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const rows = await prisma.complaint.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    return rows.map((r) => ({ status: r.status, count: r._count._all }));
  }

  async countByDay(from: Date, to: Date) {
    const rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM complaints
      WHERE "deletedAt" IS NULL
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY 1
      ORDER BY 1 ASC
    `;
    return rows.map((r) => ({
      day: r.day.toISOString().slice(0, 10),
      count: Number(r.count),
    }));
  }

  async repeatOffenders(from?: Date, to?: Date) {
    const where: Prisma.ComplaintWhereInput = {
      deletedAt: null,
      submitterId: { not: null },
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const grouped = await prisma.complaint.groupBy({
      by: ['submitterId'],
      where,
      _count: { _all: true },
      having: { submitterId: { _count: { gt: 1 } } },
      orderBy: { _count: { submitterId: 'desc' } },
    });

    const submitterIds = grouped
      .map((g) => g.submitterId)
      .filter((id): id is string => id != null);

    const users = await prisma.user.findMany({
      where: { id: { in: submitterIds } },
      select: { id: true, fullName: true, employeeNumber: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return grouped.map((g) => ({
      submitterId: g.submitterId!,
      count: g._count._all,
      submitter: userMap.get(g.submitterId!) ?? null,
    }));
  }
}

export const complaintRepository = new ComplaintRepository();
