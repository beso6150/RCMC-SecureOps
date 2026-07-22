import { describe, expect, it } from 'vitest';
import { formatReportNumber } from '../application/reportNumbering.js';
import { averageDurationMs } from '../application/KpiService.js';
import { sanitizeCsvCell, csvExportService } from '../application/CsvExportService.js';
import { maskSensitiveData, isSensitiveKey } from '../application/sensitiveMasking.js';
import {
  assertCustomReportRequest,
  CUSTOM_REPORT_DATA_SOURCES,
} from '../application/CustomReportService.js';
import { assertSelfApproveAllowed } from '../application/ReportApprovalService.js';
import { pdfExportService } from '../application/PdfExportService.js';
import { ForbiddenError, ValidationError } from '../../../shared/errors/index.js';

describe('report numbering', () => {
  it('formats RPT-YYYY-######', () => {
    expect(formatReportNumber(2026, 1)).toBe('RPT-2026-000001');
    expect(formatReportNumber(2026, 42)).toBe('RPT-2026-000042');
    expect(formatReportNumber(2026, 999999)).toBe('RPT-2026-999999');
  });

  it('zero-pads to six digits', () => {
    expect(formatReportNumber(2025, 7).endsWith('000007')).toBe(true);
  });
});

describe('response time averages', () => {
  it('excludes incomplete date pairs from averages', () => {
    const result = averageDurationMs([
      { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T10:10:00Z') },
      { start: new Date('2026-01-01T11:00:00Z'), end: null },
      { start: null, end: new Date('2026-01-01T12:00:00Z') },
      { start: new Date('2026-01-01T13:00:00Z'), end: new Date('2026-01-01T13:20:00Z') },
    ]);
    expect(result.sampleCount).toBe(2);
    expect(result.averageMs).toBe(15 * 60_000);
    expect(result.averageMinutes).toBe(15);
  });

  it('returns null average when no complete pairs', () => {
    const result = averageDurationMs([
      { start: new Date('2026-01-01T10:00:00Z'), end: null },
      { start: null, end: null },
    ]);
    expect(result.sampleCount).toBe(0);
    expect(result.averageMs).toBeNull();
    expect(result.averageMinutes).toBeNull();
  });

  it('ignores inverted end-before-start pairs', () => {
    const result = averageDurationMs([
      { start: new Date('2026-01-01T12:00:00Z'), end: new Date('2026-01-01T11:00:00Z') },
      { start: new Date('2026-01-01T10:00:00Z'), end: new Date('2026-01-01T10:05:00Z') },
    ]);
    expect(result.sampleCount).toBe(1);
    expect(result.averageMinutes).toBe(5);
  });
});

describe('CSV formula injection', () => {
  it('prefixes dangerous cells starting with = + - @', () => {
    expect(sanitizeCsvCell('=CMD()')).toBe("'=CMD()");
    expect(sanitizeCsvCell('+1234')).toBe("'+1234");
    expect(sanitizeCsvCell('-1+2')).toBe("'-1+2");
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('leaves safe values unchanged', () => {
    expect(sanitizeCsvCell('حادثة')).toBe('حادثة');
    expect(sanitizeCsvCell('123')).toBe('123');
  });

  it('adds UTF-8 BOM and Arabic headers', () => {
    const csv = csvExportService.buildCsv(['الاسم', 'القيمة'], [['=1+1', 'آمن']]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('الاسم');
    expect(csv).toContain("'=1+1");
  });
});

describe('sensitive field masking', () => {
  it('detects sensitive keys', () => {
    expect(isSensitiveKey('password')).toBe(true);
    expect(isSensitiveKey('refreshToken')).toBe(true);
    expect(isSensitiveKey('access_token')).toBe(true);
    expect(isSensitiveKey('jwt')).toBe(true);
    expect(isSensitiveKey('clientSecret')).toBe(true);
    expect(isSensitiveKey('fullName')).toBe(false);
  });

  it('masks nested sensitive values', () => {
    const masked = maskSensitiveData({
      fullName: 'Bassam',
      password: 'secret123',
      nested: { token: 'abc', ok: true },
    }) as Record<string, unknown>;
    expect(masked.fullName).toBe('Bassam');
    expect(masked.password).toBe('***');
    expect((masked.nested as Record<string, unknown>).token).toBe('***');
    expect((masked.nested as Record<string, unknown>).ok).toBe(true);
  });
});

describe('custom report allowlist', () => {
  it('accepts known data sources', () => {
    expect(() => assertCustomReportRequest([...CUSTOM_REPORT_DATA_SOURCES].slice(0, 2))).not.toThrow();
  });

  it('rejects unknown data source', () => {
    expect(() => assertCustomReportRequest(['raw_sql' as never])).toThrow(ValidationError);
    expect(() => assertCustomReportRequest(['incidents; DROP TABLE' as never])).toThrow(
      /مصدر بيانات غير مسموح/,
    );
  });

  it('rejects unknown fields for a source', () => {
    expect(() =>
      assertCustomReportRequest(['incidents'], { incidents: ['hackedColumn'] }),
    ).toThrow(/حقل غير مسموح/);
  });
});

describe('approval self-approve', () => {
  it('blocks self-approve when setting is false', () => {
    expect(() => assertSelfApproveAllowed('user-1', 'user-1', false)).toThrow(ForbiddenError);
    expect(() => assertSelfApproveAllowed('user-1', 'user-1', false)).toThrow(
      /لا يمكن اعتماد تقرير/,
    );
  });

  it('allows self-approve when setting is true', () => {
    expect(() => assertSelfApproveAllowed('user-1', 'user-1', true)).not.toThrow();
  });

  it('allows different approver when setting is false', () => {
    expect(() => assertSelfApproveAllowed('approver', 'author', false)).not.toThrow();
  });
});

describe('PDF export', () => {
  it('produces a buffer starting with %PDF', async () => {
    const buffer = await pdfExportService.buildReportPdf({
      title: 'تقرير اختبار',
      reportNumber: 'RPT-2026-000001',
      sections: [{ title: 'ملخص', lines: ['حوادث: 0', 'ورديات: 1'] }],
      recommendations: 'لا توجد توصيات',
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
