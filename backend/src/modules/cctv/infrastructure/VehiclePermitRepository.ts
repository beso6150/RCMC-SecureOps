import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { vehiclePermitInclude, VehiclePermitWithRelations } from '../domain/types.js';

export class VehiclePermitRepository {
  async searchByPlate(plateNumber: string): Promise<VehiclePermitWithRelations[]> {
    const normalized = plateNumber.trim();
    if (!normalized) return [];

    return prisma.vehiclePermit.findMany({
      where: {
        deletedAt: null,
        OR: [
          { plateNumber: { equals: normalized, mode: 'insensitive' } },
          { plateNumber: { contains: normalized, mode: 'insensitive' } },
        ],
      },
      include: vehiclePermitInclude,
      orderBy: [{ status: 'asc' }, { validTo: 'desc' }],
      take: 50,
    });
  }

  async findById(id: string): Promise<VehiclePermitWithRelations | null> {
    return prisma.vehiclePermit.findFirst({
      where: { id, deletedAt: null },
      include: vehiclePermitInclude,
    });
  }

  async create(data: Prisma.VehiclePermitCreateInput): Promise<VehiclePermitWithRelations> {
    return prisma.vehiclePermit.create({
      data,
      include: vehiclePermitInclude,
    });
  }
}

export const vehiclePermitRepository = new VehiclePermitRepository();
