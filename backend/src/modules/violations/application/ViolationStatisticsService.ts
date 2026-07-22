import { violationRepository } from '../infrastructure/ViolationRepository.js';

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

class ViolationStatisticsService {
  async getSummary(query: StatisticsQuery = {}) {
    const { from, to } = defaultRange(query);

    const [
      averageResponseMs,
      dailyViolations,
      monthlyViolations,
      byLocation,
      byUser,
    ] = await Promise.all([
      violationRepository.getAverageResponseMs(from, to),
      violationRepository.countByDay(from, to),
      violationRepository.countByMonth(from, to),
      violationRepository.countByLocation(from, to),
      violationRepository.countByUser(from, to),
    ]);

    const totalInRange = dailyViolations.reduce((sum, d) => sum + d.count, 0);

    return {
      range: { from, to },
      averageResponseTime: {
        milliseconds: averageResponseMs,
        seconds: averageResponseMs != null ? Math.round(averageResponseMs / 1000) : null,
        minutes:
          averageResponseMs != null
            ? Math.round((averageResponseMs / 60_000) * 100) / 100
            : null,
      },
      totalViolations: totalInRange,
      dailyViolations,
      monthlyViolations,
      violationsByLocation: byLocation,
      violationsByUser: byUser,
    };
  }
}

export const violationStatisticsService = new ViolationStatisticsService();
