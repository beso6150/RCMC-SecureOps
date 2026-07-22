import {
  HostCommunicationPreference,
  VisitImportance,
  VisitStatus,
  VisitHistoryAction,
  VisitNotificationChannel,
} from '@prisma/client';

export const ALLOWED_SENDER_DOMAIN = 'rcmc.gov.sa';

export const VISIT_STATUS_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
  UPCOMING: ['ARRIVED', 'CANCELLED'],
  ARRIVED: ['HOST_NOTIFIED', 'CANCELLED'],
  HOST_NOTIFIED: ['IN_MEETING', 'COMPLETED', 'CANCELLED'],
  IN_MEETING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const IMPORTANCE_NOTIFIES_DIRECTOR: VisitImportance[] = [
  VisitImportance.IMPORTANT,
  VisitImportance.VIP,
];

export function hostUsesWhatsApp(preference: HostCommunicationPreference, whatsappEnabled: boolean): boolean {
  if (!whatsappEnabled) return false;
  return (
    preference === HostCommunicationPreference.WHATSAPP ||
    preference === HostCommunicationPreference.BOTH
  );
}

export function hostUsesPhoneCall(preference: HostCommunicationPreference, phoneCallEnabled: boolean): boolean {
  if (!phoneCallEnabled) return false;
  return (
    preference === HostCommunicationPreference.PHONE_CALL ||
    preference === HostCommunicationPreference.BOTH
  );
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildPhoneCallUri(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return `tel:${cleaned}`;
}

export function buildHostArrivalMessage(visitorName: string, purpose?: string | null, room?: string | null): string {
  const parts = [
    `مرحباً، زائرك ${visitorName} وصل.`,
    purpose ? `الغرض: ${purpose}` : null,
    room ? `القاعة: ${room}` : null,
    'Hello, your visitor has arrived.',
  ].filter(Boolean);
  return parts.join('\n');
}

export { VisitStatus, VisitImportance, VisitHistoryAction, VisitNotificationChannel, HostCommunicationPreference };
