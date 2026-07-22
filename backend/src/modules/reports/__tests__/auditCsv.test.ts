import { describe, expect, it } from 'vitest';
import { csvExportService, sanitizeCsvCell } from '../application/CsvExportService.js';
import { maskSensitiveData } from '../application/sensitiveMasking.js';

describe('audit CSV export helpers', () => {
  it('masks password token secret jwt refreshToken in payloads', () => {
    const masked = maskSensitiveData({
      action: 'LOGIN',
      password: 'P@ssw0rd!',
      token: 'eyJhbGciOi',
      secret: 's3cr3t',
      jwt: 'header.payload.sig',
      refreshToken: 'rt-123',
      metadata: { accessToken: 'at-9', note: 'ok' },
    }) as Record<string, unknown>;

    expect(masked.password).toBe('***');
    expect(masked.token).toBe('***');
    expect(masked.secret).toBe('***');
    expect(masked.jwt).toBe('***');
    expect(masked.refreshToken).toBe('***');
    expect((masked.metadata as Record<string, unknown>).accessToken).toBe('***');
    expect((masked.metadata as Record<string, unknown>).note).toBe('ok');
    expect(masked.action).toBe('LOGIN');
  });

  it('builds audit-style CSV with BOM and injection-safe cells', () => {
    const csv = csvExportService.buildFromObjects(
      [
        { key: 'action', headerAr: 'الإجراء' },
        { key: 'description', headerAr: 'الوصف' },
      ],
      [
        { action: 'EXPORT', description: '=HYPERLINK("http://evil")' },
        { action: 'LOGIN', description: 'دخول ناجح' },
      ],
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('الإجراء');
    expect(csv).toContain("'=HYPERLINK");
    expect(sanitizeCsvCell('@risk')).toBe("'@risk");
  });
});
