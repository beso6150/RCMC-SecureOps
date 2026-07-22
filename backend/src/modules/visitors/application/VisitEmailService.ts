import { AuditAction, Prisma, VisitEmailParseStatus, VisitHistoryAction } from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { ALLOWED_SENDER_DOMAIN } from '../domain/constants.js';
import { visitorRepository } from '../infrastructure/VisitorRepository.js';

export interface IngestEmailInput {
  subject: string;
  body: string;
  receivedAt: Date;
  senderEmail: string;
  rawHeaders?: Prisma.InputJsonValue;
  visitorId?: string | null;
}

class VisitEmailService {
  async ingest(actor: AuthenticatedUser, input: IngestEmailInput, meta: RequestMeta = {}) {
    const email = input.senderEmail.trim().toLowerCase();
    const at = email.lastIndexOf('@');
    if (at < 0) {
      throw new ValidationError('Invalid sender email');
    }
    const domain = email.slice(at + 1);
    if (domain !== ALLOWED_SENDER_DOMAIN) {
      throw new ValidationError(`Sender domain must be @${ALLOWED_SENDER_DOMAIN}`);
    }

    if (input.visitorId) {
      const visitor = await visitorRepository.findVisitorById(input.visitorId);
      if (!visitor) throw new NotFoundError('Visitor not found');
    }

    const record = await visitorRepository.createEmailIngest({
      subject: input.subject,
      body: input.body,
      receivedAt: input.receivedAt,
      senderDomain: domain,
      senderEmail: email,
      visitorId: input.visitorId ?? null,
      rawHeaders: input.rawHeaders,
    });

    if (input.visitorId) {
      await visitorRepository.addHistory({
        visitorId: input.visitorId,
        action: VisitHistoryAction.EMAIL_IMPORTED,
        actorId: actor.id,
        notes: input.subject,
        metadata: { emailIngestId: record.id, senderEmail: email },
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'VisitEmailIngest',
      entityId: record.id,
      metadata: {
        senderDomain: domain,
        subject: input.subject,
        parseStatus: VisitEmailParseStatus.PENDING,
      },
      meta,
    });

    return record;
  }

  async list(parseStatus?: string) {
    return visitorRepository.listEmailIngests(parseStatus);
  }
}

export const visitEmailService = new VisitEmailService();
