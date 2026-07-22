import {

  ComplaintStatus,

  IncidentStatus,

  SavedReportStatus,

  VisitStatus,

} from '@prisma/client';

import { prisma } from '../../../shared/database/prisma.js';

import { buildTextPdf } from '../../../shared/utils/minimalPdf.js';

import { broadcast } from '../../../shared/realtime/socketServer.js';

import { violationRepository } from '../../violations/infrastructure/ViolationRepository.js';

import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';

import { AuditAction, ReportAccessAction } from '@prisma/client';

import { auditService } from '../../identity/application/AuditService.js';

import { csvExportService } from './CsvExportService.js';

import { pdfExportService } from './PdfExportService.js';

import { saveReportFile } from './ReportStorage.js';

import { reportGenerationService } from './ReportGenerationService.js';

import { kpiService } from './KpiService.js';



export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';



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



function resolvePeriodRange(period: ReportPeriod): { from: Date; to: Date; label: string } {

  const now = new Date();

  const to = endOfDay(now);



  switch (period) {

    case 'daily':

      return { from: startOfDay(now), to, label: 'Daily' };

    case 'weekly': {

      const from = startOfDay(new Date(now));

      from.setDate(from.getDate() - 6);

      return { from, to, label: 'Weekly' };

    }

    case 'monthly':

      return {

        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),

        to,

        label: 'Monthly',

      };

    case 'yearly':

      return {

        from: startOfDay(new Date(now.getFullYear(), 0, 1)),

        to,

        label: 'Yearly',

      };

    default:

      return { from: startOfDay(now), to, label: 'Daily' };

  }

}



class ReportService {

  async getSummary(period: ReportPeriod) {

    const { from, to, label } = resolvePeriodRange(period);



    const [

      violations,

      incidents,

      visitors,

      complaints,

      openIncidents,

      openComplaints,

      averageResponseMs,

    ] = await Promise.all([

      prisma.vehicleViolation.count({

        where: { deletedAt: null, createdAt: { gte: from, lte: to } },

      }),

      prisma.incident.count({

        where: { deletedAt: null, createdAt: { gte: from, lte: to } },

      }),

      prisma.visitor.count({

        where: {

          deletedAt: null,

          status: { not: VisitStatus.CANCELLED },

          OR: [

            { arrivalTime: { gte: from, lte: to } },

            { visitDate: { gte: from, lte: to } },

          ],

        },

      }),

      prisma.complaint.count({

        where: { deletedAt: null, createdAt: { gte: from, lte: to } },

      }),

      prisma.incident.count({

        where: {

          deletedAt: null,

          status: {

            in: [

              IncidentStatus.NEW,

              IncidentStatus.ASSIGNED,

              IncidentStatus.IN_PROGRESS,

              IncidentStatus.ON_HOLD,

            ],

          },

        },

      }),

      prisma.complaint.count({

        where: {

          deletedAt: null,

          status: {

            in: [

              ComplaintStatus.SUBMITTED,

              ComplaintStatus.UNDER_REVIEW,

              ComplaintStatus.APPROVED,

            ],

          },

        },

      }),

      violationRepository.getAverageResponseMs(from, to),

    ]);



    return {

      period,

      label,

      range: { from, to },

      violations,

      incidents,

      visitors,

      complaints,

      openIncidents,

      openComplaints,

      averageResponseMs,

      averageResponseMinutes:

        averageResponseMs != null

          ? Math.round((averageResponseMs / 60_000) * 100) / 100

          : null,

    };

  }



  async getDashboardOverview(period: ReportPeriod = 'daily') {

    const { from, to, label } = resolvePeriodRange(period);

    const [summary, kpis, recentReports, pendingApproval, byStatus] = await Promise.all([

      this.getSummary(period),

      kpiService.getAll({ from, to }),

      prisma.savedReport.findMany({

        where: { deletedAt: null },

        orderBy: { generatedAt: 'desc' },

        take: 8,

        select: {

          id: true,

          reportNumber: true,

          title: true,

          reportType: true,

          status: true,

          generatedAt: true,

          version: true,

        },

      }),

      prisma.savedReport.count({

        where: { deletedAt: null, status: SavedReportStatus.UNDER_REVIEW },

      }),

      prisma.savedReport.groupBy({

        by: ['status'],

        where: { deletedAt: null },

        _count: { _all: true },

      }),

    ]);



    return {

      period,

      label,

      range: { from, to },

      summary,

      kpis,

      recentReports,

      pendingApproval,

      reportsByStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),

    };

  }



  async exportCsv(period: ReportPeriod): Promise<string> {

    const summary = await this.getSummary(period);

    const rows = [

      ['metric', 'value'],

      ['period', summary.period],

      ['violations', String(summary.violations)],

      ['incidents', String(summary.incidents)],

      ['visitors', String(summary.visitors)],

      ['complaints', String(summary.complaints)],

      ['openIncidents', String(summary.openIncidents)],

      ['openComplaints', String(summary.openComplaints)],

      ['averageResponseMs', summary.averageResponseMs != null ? String(summary.averageResponseMs) : ''],

      ['averageResponseMinutes', summary.averageResponseMinutes != null ? String(summary.averageResponseMinutes) : ''],

    ];

    return rows.map((r) => r.join(',')).join('\n');

  }



  async exportPdf(period: ReportPeriod): Promise<Buffer> {

    const summary = await this.getSummary(period);

    const lines = [

      `RCMC SecureOps Report — ${summary.label}`,

      `Period: ${summary.period}`,

      `Range: ${summary.range.from.toISOString()} — ${summary.range.to.toISOString()}`,

      `Violations: ${summary.violations}`,

      `Incidents: ${summary.incidents}`,

      `Visitors: ${summary.visitors}`,

      `Complaints: ${summary.complaints}`,

      `Open Incidents: ${summary.openIncidents}`,

      `Open Complaints: ${summary.openComplaints}`,

      `Average Response (min): ${summary.averageResponseMinutes ?? 'N/A'}`,

      `Generated: ${new Date().toISOString()}`,

    ];

    return buildTextPdf(lines);

  }



  async exportSavedReportPdf(

    actor: AuthenticatedUser,

    reportId: string,

    meta: RequestMeta = {},

  ): Promise<{ buffer: Buffer; fileName: string }> {

    const report = await reportGenerationService.getById(reportId);

    const buffer = await pdfExportService.buildReportPdf({

      title: report.title,

      reportNumber: `${report.reportNumber}-v${report.version}`,

      subtitle: `النوع: ${report.reportType} | الحالة: ${report.status}`,

      metaLines: [

        `من: ${report.dateFrom.toISOString()}`,

        `إلى: ${report.dateTo.toISOString()}`,

        `أعدّه: ${report.generatedBy.fullName}`,

      ],

      sections: report.sections.map((s) => ({

        title: s.title,

        text: s.textContent ?? undefined,

        lines: s.contentJson

          ? [JSON.stringify(s.contentJson, null, 0).slice(0, 1500)]

          : undefined,

      })),

      recommendations: report.recommendations,

    });



    const stored = await saveReportFile({

      reportId: report.id,

      version: report.version,

      buffer,

      extension: '.pdf',

      mimeType: 'application/pdf',

    });



    await prisma.savedReport.update({

      where: { id: report.id },

      data: {

        filePath: stored.storagePath,

        fileMimeType: stored.mimeType,

        fileSize: stored.fileSize,

        checksumSha256: stored.checksumSha256,

      },

    });



    await prisma.reportAccessLog.create({

      data: {

        reportId: report.id,

        userId: actor.id,

        action: ReportAccessAction.DOWNLOAD_PDF,

        ipAddress: meta.ipAddress ?? null,

        userAgent: meta.userAgent ?? null,

      },

    });



    await auditService.log({

      actorId: actor.id,

      action: AuditAction.DOWNLOAD,

      entityType: 'SavedReport',

      entityId: report.id,

      module: 'reports',

      description: 'تنزيل تقرير PDF',

      meta,

    });



    broadcast('report:export-ready', {

      reportId: report.id,

      format: 'pdf',

      path: stored.storagePath,

    });



    return {

      buffer,

      fileName: `${report.reportNumber}-v${report.version}.pdf`,

    };

  }



  async exportSavedReportCsv(

    actor: AuthenticatedUser,

    reportId: string,

    meta: RequestMeta = {},

  ): Promise<{ csv: string; fileName: string }> {

    const report = await reportGenerationService.getById(reportId);

    const rows: unknown[][] = [

      [report.reportNumber, report.title, report.reportType, report.status],

    ];

    for (const section of report.sections) {

      rows.push([

        section.sectionKey,

        section.title,

        section.sectionType,

        section.textContent ?? JSON.stringify(section.contentJson ?? {}),

      ]);

    }



    const csv = csvExportService.buildCsv(

      ['رقم التقرير', 'العنوان', 'النوع', 'الحالة'],

      rows,

    );



    const buffer = Buffer.from(csv, 'utf8');

    const stored = await saveReportFile({

      reportId: report.id,

      version: report.version,

      buffer,

      extension: '.csv',

      mimeType: 'text/csv; charset=utf-8',

    });



    await prisma.savedReport.update({

      where: { id: report.id },

      data: { csvPath: stored.storagePath },

    });



    await prisma.reportAccessLog.create({

      data: {

        reportId: report.id,

        userId: actor.id,

        action: ReportAccessAction.DOWNLOAD_CSV,

        ipAddress: meta.ipAddress ?? null,

        userAgent: meta.userAgent ?? null,

      },

    });



    await auditService.log({

      actorId: actor.id,

      action: AuditAction.EXPORT,

      entityType: 'SavedReport',

      entityId: report.id,

      module: 'reports',

      description: 'تصدير تقرير CSV',

      meta,

    });



    broadcast('report:export-ready', {

      reportId: report.id,

      format: 'csv',

      path: stored.storagePath,

    });



    return {

      csv,

      fileName: `${report.reportNumber}-v${report.version}.csv`,

    };

  }

}



export const reportService = new ReportService();


