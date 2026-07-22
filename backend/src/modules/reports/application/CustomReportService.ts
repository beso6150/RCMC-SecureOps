import { Prisma, SavedReportType } from '@prisma/client';
import { ValidationError } from '../../../shared/errors/index.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { kpiService } from './KpiService.js';
import { reportGenerationService } from './ReportGenerationService.js';

/** Allowlisted data sources — NO raw SQL. */
export const CUSTOM_REPORT_DATA_SOURCES = [
  'incidents',
  'response_times',
  'patrols',
  'cctv_referrals',
  'permits',
  'violations',
  'visitors',
  'personnel',
  'groups',
  'shifts',
] as const;

export type CustomReportDataSource = (typeof CUSTOM_REPORT_DATA_SOURCES)[number];

const FIELD_ALLOWLIST: Record<CustomReportDataSource, readonly string[]> = {
  incidents: ['total', 'open', 'closed', 'bySeverity', 'avgAckMinutes', 'avgResolveMinutes'],
  response_times: ['overall', 'byMetric'],
  patrols: ['total', 'completed', 'inProgress', 'cancelled'],
  cctv_referrals: ['total', 'byStatus', 'avgReceive', 'avgResolve'],
  permits: ['total', 'byStatus'],
  violations: ['total', 'byStatus'],
  visitors: ['total', 'byStatus'],
  personnel: ['onDutyCount'],
  groups: ['total', 'items'],
  shifts: ['total', 'open', 'closed', 'byKind'],
};

export function assertCustomReportRequest(
  dataSources: string[],
  fields?: Record<string, string[]>,
): asserts dataSources is CustomReportDataSource[] {
  if (!dataSources.length) {
    throw new ValidationError('يجب تحديد مصدر بيانات واحد على الأقل');
  }
  for (const src of dataSources) {
    if (!(CUSTOM_REPORT_DATA_SOURCES as readonly string[]).includes(src)) {
      throw new ValidationError(`مصدر بيانات غير مسموح: ${src}`);
    }
    const allowed = FIELD_ALLOWLIST[src as CustomReportDataSource];
    const requested = fields?.[src];
    if (requested?.length) {
      for (const f of requested) {
        if (!allowed.includes(f)) {
          throw new ValidationError(`حقل غير مسموح لمصدر ${src}: ${f}`);
        }
      }
    }
  }
}

function pickFields(
  source: CustomReportDataSource,
  data: Record<string, unknown>,
  fields?: string[],
): Record<string, unknown> {
  const allowed = FIELD_ALLOWLIST[source];
  const keys = fields?.length ? fields.filter((f) => allowed.includes(f)) : [...allowed];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in data) out[k] = data[k];
  }
  return out;
}

class CustomReportService {
  async generate(
    actor: AuthenticatedUser,
    input: {
      title: string;
      dateFrom: Date;
      dateTo: Date;
      dataSources: string[];
      fields?: Record<string, string[]>;
      groupId?: string | null;
      zoneId?: string | null;
      userId?: string | null;
      notes?: string | null;
    },
    meta: RequestMeta = {},
  ) {
    assertCustomReportRequest(input.dataSources, input.fields);

    const kpis = await kpiService.getAll({
      from: input.dateFrom,
      to: input.dateTo,
      groupId: input.groupId ?? undefined,
      zoneId: input.zoneId ?? undefined,
      userId: input.userId ?? undefined,
    });

    const content: Record<string, unknown> = {};
    for (const src of input.dataSources) {
      switch (src) {
        case 'incidents':
          content.incidents = pickFields(src, kpis.incidents as never, input.fields?.[src]);
          break;
        case 'response_times':
          content.response_times = pickFields(src, kpis.responseTimes as never, input.fields?.[src]);
          break;
        case 'patrols':
          content.patrols = pickFields(src, kpis.patrols as never, input.fields?.[src]);
          break;
        case 'cctv_referrals':
          content.cctv_referrals = pickFields(
            src,
            kpis.cctvReferrals as never,
            input.fields?.[src],
          );
          break;
        case 'permits':
          content.permits = pickFields(src, kpis.permits as never, input.fields?.[src]);
          break;
        case 'violations':
          content.violations = pickFields(src, kpis.violations as never, input.fields?.[src]);
          break;
        case 'visitors':
          content.visitors = pickFields(src, kpis.visitors as never, input.fields?.[src]);
          break;
        case 'personnel':
          content.personnel = pickFields(src, kpis.personnel as never, input.fields?.[src]);
          break;
        case 'groups':
          content.groups = pickFields(src, kpis.groups as never, input.fields?.[src]);
          break;
        case 'shifts':
          content.shifts = pickFields(src, kpis.shifts as never, input.fields?.[src]);
          break;
        default:
          break;
      }
    }

    return reportGenerationService.generate(
      actor,
      {
        reportType: SavedReportType.CUSTOM,
        title: input.title,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        groupId: input.groupId,
        zoneId: input.zoneId,
        userId: input.userId,
        notes: input.notes,
        filtersJson: {
          dataSources: input.dataSources,
          fields: input.fields ?? {},
          content,
        } as Prisma.InputJsonValue,
      },
      meta,
    );
  }
}

export const customReportService = new CustomReportService();
