import { visitorRepository } from '../infrastructure/VisitorRepository.js';

export interface VisitStatsQuery {
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

class VisitStatisticsService {
  async getSummary(query: VisitStatsQuery = {}) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const to = query.to ? endOfDay(query.to) : todayEnd;
    const from = query.from ? startOfDay(query.from) : startOfDay(new Date(to.getFullYear(), to.getMonth(), 1));

    const [
      todaysVisitors,
      visitorsByDepartment,
      visitorsByFloor,
      visitorsByImportance,
      averageHostResponseMs,
    ] = await Promise.all([
      visitorRepository.countToday(todayStart, todayEnd),
      visitorRepository.countByDepartment(from, to),
      visitorRepository.countByFloor(from, to),
      visitorRepository.countByImportance(from, to),
      visitorRepository.averageHostResponseMs(from, to),
    ]);

    return {
      range: { from, to },
      todaysVisitors,
      visitorsByDepartment,
      visitorsByFloor,
      visitorsByImportance: visitorsByImportance.map((r) => ({
        importance: r.importance,
        count: r._count._all,
      })),
      averageHostResponseTime: {
        milliseconds: averageHostResponseMs,
        seconds: averageHostResponseMs != null ? Math.round(averageHostResponseMs / 1000) : null,
        minutes:
          averageHostResponseMs != null
            ? Math.round((averageHostResponseMs / 60_000) * 100) / 100
            : null,
      },
    };
  }
}

export const visitStatisticsService = new VisitStatisticsService();
