import { complaintRepository } from '../infrastructure/ComplaintRepository.js';

export interface StatisticsQuery {
  from?: Date;
  to?: Date;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function defaultRange(query: StatisticsQuery): { from: Date; to: Date } {
  const to = query.to ? endOfDay(query.to) : endOfDay(new Date());
  const from = query.from
    ? startOfDay(query.from)
    : startOfDay(new Date(to.getFullYear(), to.getMonth() - 1, to.getDate()));
  return { from, to };
}

class ComplaintStatisticsService {
  async getSummary(query: StatisticsQuery = {}) {
    const { from, to } = defaultRange(query);

    const [byStatus, byDay, repeatOffenders] = await Promise.all([
      complaintRepository.countByStatus(from, to),
      complaintRepository.countByDay(from, to),
      complaintRepository.repeatOffenders(from, to),
    ]);

    const total = byStatus.reduce((sum, s) => sum + s.count, 0);

    return {
      range: { from, to },
      total,
      byStatus,
      byDay,
      repeatOffenders,
    };
  }
}

export const complaintStatisticsService = new ComplaintStatisticsService();
