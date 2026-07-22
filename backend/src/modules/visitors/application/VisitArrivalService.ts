import {
  AuditAction,
  NotificationPriority,
  Prisma,
  VisitHistoryAction,
  VisitImportance,
  VisitNotificationChannel,
  VisitNotificationDeliveryStatus,
  VisitStatus,
} from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  IMPORTANCE_NOTIFIES_DIRECTOR,
  VISIT_STATUS_TRANSITIONS,
  buildHostArrivalMessage,
  buildPhoneCallUri,
  buildWhatsAppLink,
  hostUsesPhoneCall,
  hostUsesWhatsApp,
} from '../domain/constants.js';
import { visitorRepository } from '../infrastructure/VisitorRepository.js';

class VisitArrivalService {
  async markArrived(actor: AuthenticatedUser, visitorId: string, meta: RequestMeta = {}) {
    const visitor = await visitorRepository.findVisitorById(visitorId);
    if (!visitor) throw new NotFoundError('Visitor not found');

    const allowed = VISIT_STATUS_TRANSITIONS[visitor.status] ?? [];
    if (!allowed.includes(VisitStatus.ARRIVED) && visitor.status !== VisitStatus.ARRIVED) {
      if (visitor.status !== VisitStatus.UPCOMING) {
        throw new ConflictError(`Cannot mark arrived from status ${visitor.status}`);
      }
    }

    const now = new Date();
    const host = visitor.host;
    if (!host) throw new ValidationError('Visitor has no host assigned');

    let current = visitor;
    if (visitor.status === VisitStatus.UPCOMING) {
      current = await visitorRepository.updateVisitor(visitorId, {
        status: VisitStatus.ARRIVED,
        arrivalTime: visitor.arrivalTime ?? now,
      });

      await visitorRepository.addHistory({
        visitorId,
        action: VisitHistoryAction.ARRIVED,
        actorId: actor.id,
        fromStatus: VisitStatus.UPCOMING,
        toStatus: VisitStatus.ARRIVED,
      });
    }

    const roomLabel = current.meetingRoom
      ? `${current.meetingRoom.nameEn} / ${current.meetingRoom.nameAr}`
      : null;
    const message = buildHostArrivalMessage(current.visitorName, current.purpose, roomLabel);

    const hostActions: Array<{
      channel: VisitNotificationChannel;
      title: string;
      body: string;
      payload: Prisma.InputJsonValue;
    }> = [];

    if (hostUsesWhatsApp(host.communicationPreference, host.whatsappEnabled)) {
      if (!host.phone) {
        throw new ValidationError('Host WhatsApp preference requires a phone number');
      }
      const link = buildWhatsAppLink(host.phone, message);
      hostActions.push({
        channel: VisitNotificationChannel.WHATSAPP,
        title: 'Notify host via WhatsApp',
        body: message,
        payload: {
          type: 'whatsapp',
          phone: host.phone,
          message,
          deepLink: link,
          launch: true,
        },
      });
    }

    if (hostUsesPhoneCall(host.communicationPreference, host.phoneCallEnabled)) {
      if (!host.phone) {
        throw new ValidationError('Host phone-call preference requires a phone number');
      }
      const uri = buildPhoneCallUri(host.phone);
      hostActions.push({
        channel: VisitNotificationChannel.PHONE_CALL,
        title: 'Call host',
        body: `Launch phone call to ${host.employeeName}`,
        payload: {
          type: 'phone_call',
          phone: host.phone,
          dialUri: uri,
          launch: true,
        },
      });
    }

    for (const action of hostActions) {
      await visitorRepository.createNotification({
        visitor: { connect: { id: visitorId } },
        channel: action.channel,
        title: action.title,
        body: action.body,
        status: VisitNotificationDeliveryStatus.SENT,
        sentAt: now,
        payload: action.payload,
      });
    }

    const roleCodes: string[] = [
      RoleCodes.SECURITY_SUPERVISOR,
      RoleCodes.OPERATIONS_MANAGER,
    ];
    const notifyDirector = IMPORTANCE_NOTIFIES_DIRECTOR.includes(current.importance);
    if (notifyDirector) {
      roleCodes.push(RoleCodes.SECURITY_DIRECTOR);
    }

    const recipients = await visitorRepository.findUsersByRoleCodes(roleCodes);
    const title = notifyDirector
      ? `[${current.importance}] Visitor arrived: ${current.visitorName}`
      : `Visitor arrived: ${current.visitorName}`;
    const body = [
      `Host: ${host.employeeName} (${host.employeeNumber})`,
      current.purpose ? `Purpose: ${current.purpose}` : null,
      roomLabel ? `Room: ${roomLabel}` : null,
      `Importance: ${current.importance}`,
    ]
      .filter(Boolean)
      .join(' | ');

    for (const user of recipients) {
      if (user.role.code === RoleCodes.SECURITY_DIRECTOR && !notifyDirector) {
        continue;
      }

      await visitorRepository.createNotification({
        visitor: { connect: { id: visitorId } },
        recipient: { connect: { id: user.id } },
        channel: VisitNotificationChannel.REALTIME,
        title,
        body,
        status: VisitNotificationDeliveryStatus.SENT,
        sentAt: now,
        payload: {
          type: 'realtime',
          importance: current.importance,
          roleCode: user.role.code,
          visitorId,
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          title,
          body,
          priority:
            current.importance === VisitImportance.VIP
              ? NotificationPriority.CRITICAL
              : current.importance === VisitImportance.IMPORTANT
                ? NotificationPriority.HIGH
                : NotificationPriority.NORMAL,
          channel: 'REALTIME',
          entityType: 'Visitor',
          entityId: visitorId,
        },
      });
    }

    const notified = await visitorRepository.updateVisitor(visitorId, {
      status: VisitStatus.HOST_NOTIFIED,
      hostNotifiedAt: now,
    });

    await visitorRepository.addHistory({
      visitorId,
      action: VisitHistoryAction.HOST_NOTIFIED,
      actorId: actor.id,
      fromStatus: VisitStatus.ARRIVED,
      toStatus: VisitStatus.HOST_NOTIFIED,
      metadata: {
        channels: hostActions.map((a) => a.channel),
        directorNotified: notifyDirector,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Visitor',
      entityId: visitorId,
      metadata: {
        workflow: 'ARRIVAL',
        status: VisitStatus.HOST_NOTIFIED,
        hostChannels: hostActions.map((a) => a.channel),
        directorNotified: notifyDirector,
      },
      meta,
    });

    return {
      visitor: notified,
      hostNotificationActions: hostActions.map((a) => a.payload),
      notifiedRoles: roleCodes,
      directorNotified: notifyDirector,
    };
  }
}

export const visitArrivalService = new VisitArrivalService();
