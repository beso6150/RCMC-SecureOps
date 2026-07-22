import { ValidationError } from '../../../shared/errors/index.js';
import { vehiclePermitRepository } from '../infrastructure/VehiclePermitRepository.js';

class VehiclePermitSearchService {
  async search(plateNumber: string) {
    const query = plateNumber?.trim();
    if (!query || query.length < 2) {
      throw new ValidationError('plateNumber query is required (min 2 characters)');
    }

    const permits = await vehiclePermitRepository.searchByPlate(query);

    return permits.map((p) => ({
      id: p.id,
      plateNumber: p.plateNumber,
      vehicleType: p.vehicleType,
      ownerName: p.ownerName,
      ownerPhone: p.ownerPhone,
      employeeName: p.ownerName,
      employeePhone: p.ownerPhone,
      status: p.status,
      validFrom: p.validFrom,
      validTo: p.validTo,
      notes: p.notes,
      location: p.location,
      approvedBy: p.approvedBy,
    }));
  }
}

export const vehiclePermitSearchService = new VehiclePermitSearchService();
