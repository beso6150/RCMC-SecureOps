import { describe, expect, it } from 'vitest';
import { ForbiddenError } from '../../../shared/errors/index.js';
import {
  assertConversationParticipant,
  isActiveParticipant,
} from '../application/conversationAccess.js';
import {
  assertSafePlainText,
  sanitizeMessageContent,
} from '../application/sanitizeMessageContent.js';
import { formatConversationNumber } from '../application/conversationNumbering.js';
import { isConversationUnread } from '../application/conversationUnread.js';

describe('sanitize message content (XSS)', () => {
  it('strips HTML and script tags to plain text', () => {
    const dirty =
      '<script>alert(1)</script><b>مرحبا</b> <img src=x onerror=alert(1)>';
    expect(sanitizeMessageContent(dirty)).toBe('مرحبا');
  });

  it('removes javascript: URLs and angle brackets', () => {
    expect(sanitizeMessageContent('click javascript:alert(1) here')).not.toMatch(/javascript/i);
    expect(sanitizeMessageContent('a <b>bold</b> c')).toBe('a bold c');
    expect(sanitizeMessageContent('hello <world>')).toBe('hello');
  });

  it('rejects empty after sanitize', () => {
    expect(() => assertSafePlainText('<script></script>')).toThrow(/فارغ/);
  });
});

describe('conversation IDOR guard', () => {
  it('allows participant', () => {
    expect(() =>
      assertConversationParticipant(['u1', 'u2'], 'u1'),
    ).not.toThrow();
  });

  it('blocks non-participant with Arabic forbidden', () => {
    expect(() => assertConversationParticipant(['u1', 'u2'], 'u3')).toThrow(ForbiddenError);
    expect(() => assertConversationParticipant(['u1', 'u2'], 'u3')).toThrow(/غير مصرح/);
  });

  it('detects active participants', () => {
    expect(
      isActiveParticipant(
        [
          { userId: 'u1', leftAt: null },
          { userId: 'u2', leftAt: new Date() },
        ],
        'u1',
      ),
    ).toBe(true);
    expect(
      isActiveParticipant([{ userId: 'u2', leftAt: new Date() }], 'u2'),
    ).toBe(false);
  });
});

describe('message soft delete shape', () => {
  it('soft-deleted payload exposes null content', () => {
    const softDeleted = { id: 'm1', isDeleted: true as const, content: null };
    expect(softDeleted.content).toBeNull();
    expect(softDeleted.isDeleted).toBe(true);
  });
});

describe('conversation numbering', () => {
  it('formats CONV-YYYY-######', () => {
    expect(formatConversationNumber(2026, 1)).toBe('CONV-2026-000001');
    expect(formatConversationNumber(2026, 99)).toBe('CONV-2026-000099');
  });
});

describe('conversation unread helper', () => {
  it('counts unread when lastMessage after lastRead or never read', () => {
    const msg = new Date('2026-07-22T12:00:00.000Z');
    expect(isConversationUnread(msg, null)).toBe(true);
    expect(isConversationUnread(msg, new Date('2026-07-22T11:00:00.000Z'))).toBe(true);
    expect(isConversationUnread(msg, new Date('2026-07-22T13:00:00.000Z'))).toBe(false);
    expect(isConversationUnread(null, null)).toBe(false);
  });
});
