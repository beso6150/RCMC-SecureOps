import { apiClient } from '../../api/client';
import type { ApiResponse } from '../../types/auth';
import type {
  CreateVisitorPayload,
  VisitEmailInboxSettings,
  VisitEmailIngestRecord,
  VisitHost,
  VisitIntakeExtractionResult,
} from '../../types/visitIntake';
import { DEFAULT_VISIT_EMAIL_SETTINGS, VISIT_EMAIL_SETTING_KEY } from '../../types/visitIntake';
import {
  listSystemSettings,
  updateSystemSettings,
} from '../../api/settings';
import { createVisitor, ingestVisitEmail, listHosts } from '../../api/visitors';
import { extractVisitRequestFromText, combineArrivalDateTime } from './extractVisitRequest';
import { extractTextFromVisitAttachment } from './visitAttachmentOcr';
import { encodeVisitPurpose } from './visitIntakeMeta';

export async function loadVisitEmailSettings(): Promise<VisitEmailInboxSettings> {
  const settings = await listSystemSettings();
  const row = settings.find((s) => s.key === VISIT_EMAIL_SETTING_KEY);
  if (!row || typeof row.value !== 'object' || row.value == null) {
    return { ...DEFAULT_VISIT_EMAIL_SETTINGS };
  }
  return {
    ...DEFAULT_VISIT_EMAIL_SETTINGS,
    ...(row.value as Partial<VisitEmailInboxSettings>),
  };
}

export async function saveVisitEmailSettings(
  value: VisitEmailInboxSettings,
): Promise<VisitEmailInboxSettings> {
  await updateSystemSettings([
    {
      key: VISIT_EMAIL_SETTING_KEY,
      value,
      description:
        'IMAP mailbox settings for smart visit-request intake (configure any mailbox later)',
      isPublic: false,
    },
  ]);
  return value;
}

/** Tests IMAP connectivity when backend endpoint exists. */
export async function testVisitEmailConnection(
  settings: VisitEmailInboxSettings,
): Promise<{ ok: boolean; message: string }> {
  try {
    const { data } = await apiClient.post<ApiResponse<{ ok: boolean; message?: string }>>(
      '/visitors/emails/test-connection',
      settings,
    );
    return {
      ok: Boolean(data.data.ok),
      message: data.data.message ?? (data.data.ok ? 'الاتصال ناجح.' : 'فشل الاتصال.'),
    };
  } catch {
    return {
      ok: false,
      message:
        'اختبار الاتصال يتطلب Backend: POST /visitors/emails/test-connection — الإعدادات حُفظت محلياً في النظام عند الحفظ.',
    };
  }
}

export async function notifyVisitSupervisor(visitorId: string): Promise<{ notified: boolean }> {
  try {
    await apiClient.post(`/visitors/${visitorId}/notify-supervisor`, {
      roles: ['SECURITY_SUPERVISOR'],
      title: 'طلب زيارة جديد بانتظار الاعتماد',
    });
    return { notified: true };
  } catch {
    return { notified: false };
  }
}

export interface ProcessVisitMessageInput {
  subject: string;
  body: string;
  senderEmail: string;
  receivedAt?: string;
  attachment?: {
    fileName: string;
    mimeType: string;
    contentBase64: string;
  } | null;
}

export interface ProcessVisitMessageResult {
  ingest: VisitEmailIngestRecord;
  extraction: VisitIntakeExtractionResult;
  visitorId: string;
  notifiedSupervisor: boolean;
}

/**
 * End-to-end intake: ingest email record → extract (+OCR) → create visitor pending approval.
 */
export async function processVisitMessage(
  input: ProcessVisitMessageInput,
): Promise<ProcessVisitMessageResult> {
  let combinedText = `${input.subject}\n${input.body}`.trim();
  let sourceKind: VisitIntakeExtractionResult['sourceKind'] = 'email_text';
  let ocrUsed = false;

  if (input.attachment?.contentBase64) {
    const ocr = await extractTextFromVisitAttachment(input.attachment);
    ocrUsed = ocr.ocrUsed;
    sourceKind = ocr.sourceKind === 'email_text' ? 'email_text' : ocr.sourceKind;
    if (ocr.text) combinedText = `${combinedText}\n${ocr.text}`.trim();
  }

  const extraction = extractVisitRequestFromText(combinedText, sourceKind, ocrUsed);
  const hosts = await listHosts({
    search: extraction.fields.hostOrRoom ?? undefined,
  });
  const host =
    hosts.find((h) =>
      extraction.fields.hostOrRoom
        ? h.employeeName.includes(extraction.fields.hostOrRoom) ||
          extraction.fields.hostOrRoom.includes(h.employeeName)
        : false,
    ) ?? hosts[0];

  if (!host) {
    throw new Error('لا يوجد مضيف (Host) معرّف في النظام. أضف مضيفاً قبل استيراد طلبات الزيارة.');
  }

  const visitDate =
    extraction.fields.visitDate ?? new Date().toISOString().slice(0, 10);
  const arrivalIso = combineArrivalDateTime(visitDate, extraction.fields.arrivalTime);

  const visitorName =
    extraction.fields.visitorName?.trim() ||
    (extraction.isComplete ? 'زائر' : 'زائر بانتظار الإكمال');

  const purpose = encodeVisitPurpose(
    {
      version: 1,
      approvalStatus: 'PENDING_APPROVAL',
      approvalStatusLabelAr: 'بانتظار الاعتماد',
      missingFields: extraction.missingFields,
      isComplete: extraction.isComplete,
      sourceKind: extraction.sourceKind,
      visitorParkingCount: extraction.fields.visitorParkingCount,
      dayLabel: extraction.fields.dayLabel,
      hostOrRoom: extraction.fields.hostOrRoom,
    },
    [
      extraction.fields.notes,
      extraction.fields.hostOrRoom
        ? `الشخص/القاعة: ${extraction.fields.hostOrRoom}`
        : null,
      extraction.fields.visitorParkingCount != null
        ? `مواقف الزوار: ${extraction.fields.visitorParkingCount}`
        : null,
      extraction.missingFields.length
        ? `حقول ناقصة: ${extraction.missingFields.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  const payload: CreateVisitorPayload = {
    visitorName,
    mobile: extraction.fields.mobile,
    visitDate: new Date(`${visitDate}T00:00:00.000Z`).toISOString(),
    arrivalTime: arrivalIso,
    hostId: host.id,
    purpose,
    importance: 'NORMAL',
    organization: null,
  };

  const visitor = await createVisitor(payload);

  const ingest = await ingestVisitEmail({
    subject: input.subject,
    body: input.body,
    senderEmail: input.senderEmail,
    receivedAt: input.receivedAt ?? new Date().toISOString(),
    visitorId: visitor.id,
  });

  const notify = await notifyVisitSupervisor(visitor.id);

  return {
    ingest,
    extraction,
    visitorId: visitor.id,
    notifiedSupervisor: notify.notified,
  };
}

export type { VisitHost };
