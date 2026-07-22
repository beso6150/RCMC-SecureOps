import { ShiftGroupCode, ShiftKind } from '@prisma/client';

export interface ShiftCycleConfigFields {
  cycleStartDate: Date;
  morningStartTime: string;
  morningEndTime: string;
  eveningStartTime: string;
  eveningEndTime: string;
  timezone: string;
}

export interface ShiftWindow {
  startsAt: Date;
  endsAt: Date;
  serviceDate: Date;
  cycleDay: number;
  groupCode: ShiftGroupCode;
  nextGroupCode: ShiftGroupCode;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

interface TimeParts {
  hour: number;
  minute: number;
}

function parseTimeHHMM(time: string): TimeParts {
  const [hourRaw, minuteRaw] = time.split(':');
  return {
    hour: Number(hourRaw),
    minute: Number(minuteRaw ?? 0),
  };
}

function minutesSinceMidnight(hour: number, minute: number): number {
  return hour * 60 + minute;
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((p) => p.type === type)?.value ?? '0';
    return Number(value);
  };

  const hour = read('hour');
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: hour === 24 ? 0 : hour,
    minute: read('minute'),
    second: read('second'),
  };
}

function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const parts = getZonedParts(date, timezone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = getTimezoneOffsetMs(timezone, guess);
  return new Date(guess.getTime() - offset);
}

function addCalendarDays(year: number, month: number, day: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + delta);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

function dateOnlyUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetweenDates(start: Date, end: Date, timezone: string): number {
  const s = getZonedParts(start, timezone);
  const e = getZonedParts(end, timezone);
  const startUtc = Date.UTC(s.year, s.month - 1, s.day);
  const endUtc = Date.UTC(e.year, e.month - 1, e.day);
  return Math.floor((endUtc - startUtc) / 86_400_000);
}

export function getCycleDay(cycleStartDate: Date, now: Date, timezone: string): number {
  const diff = daysBetweenDates(cycleStartDate, now, timezone);
  return ((diff % 8) + 8) % 8 + 1;
}

export function getGroupsForCycleDay(cycleDay: number): {
  morning: ShiftGroupCode;
  evening: ShiftGroupCode;
  resting: ShiftGroupCode[];
} {
  if (cycleDay >= 1 && cycleDay <= 4) {
    return {
      morning: ShiftGroupCode.A,
      evening: ShiftGroupCode.B,
      resting: [ShiftGroupCode.C, ShiftGroupCode.D],
    };
  }

  return {
    morning: ShiftGroupCode.C,
    evening: ShiftGroupCode.D,
    resting: [ShiftGroupCode.A, ShiftGroupCode.B],
  };
}

function isInMorningWindow(parts: ZonedParts, config: ShiftCycleConfigFields): boolean {
  const nowMin = minutesSinceMidnight(parts.hour, parts.minute);
  const morningStart = parseTimeHHMM(config.morningStartTime);
  const morningEnd = parseTimeHHMM(config.morningEndTime);
  const startMin = minutesSinceMidnight(morningStart.hour, morningStart.minute);
  const endMin = minutesSinceMidnight(morningEnd.hour, morningEnd.minute);
  return nowMin >= startMin && nowMin < endMin;
}

function isInEveningWindow(parts: ZonedParts, config: ShiftCycleConfigFields): boolean {
  const nowMin = minutesSinceMidnight(parts.hour, parts.minute);
  const eveningStart = parseTimeHHMM(config.eveningStartTime);
  const eveningEnd = parseTimeHHMM(config.eveningEndTime);
  const startMin = minutesSinceMidnight(eveningStart.hour, eveningStart.minute);
  const endMin = minutesSinceMidnight(eveningEnd.hour, eveningEnd.minute);

  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }

  return nowMin >= startMin || nowMin < endMin;
}

export function getActiveKind(now: Date, config: ShiftCycleConfigFields): ShiftKind {
  const parts = getZonedParts(now, config.timezone);
  return isInMorningWindow(parts, config) ? ShiftKind.MORNING : ShiftKind.EVENING;
}

function buildMorningWindow(
  year: number,
  month: number,
  day: number,
  config: ShiftCycleConfigFields,
): Pick<ShiftWindow, 'startsAt' | 'endsAt' | 'serviceDate'> {
  const morningStart = parseTimeHHMM(config.morningStartTime);
  const morningEnd = parseTimeHHMM(config.morningEndTime);
  const tz = config.timezone;

  return {
    startsAt: zonedTimeToUtc(
      year,
      month,
      day,
      morningStart.hour,
      morningStart.minute,
      0,
      tz,
    ),
    endsAt: zonedTimeToUtc(year, month, day, morningEnd.hour, morningEnd.minute, 0, tz),
    serviceDate: dateOnlyUtc(year, month, day),
  };
}

function buildEveningWindow(
  year: number,
  month: number,
  day: number,
  config: ShiftCycleConfigFields,
): Pick<ShiftWindow, 'startsAt' | 'endsAt' | 'serviceDate'> {
  const eveningStart = parseTimeHHMM(config.eveningStartTime);
  const eveningEnd = parseTimeHHMM(config.eveningEndTime);
  const tz = config.timezone;
  const nextDay = addCalendarDays(year, month, day, 1);

  return {
    startsAt: zonedTimeToUtc(
      year,
      month,
      day,
      eveningStart.hour,
      eveningStart.minute,
      0,
      tz,
    ),
    endsAt: zonedTimeToUtc(
      nextDay.year,
      nextDay.month,
      nextDay.day,
      eveningEnd.hour,
      eveningEnd.minute,
      0,
      tz,
    ),
    serviceDate: dateOnlyUtc(year, month, day),
  };
}

export function computeShiftWindow(
  kind: ShiftKind,
  now: Date,
  config: ShiftCycleConfigFields,
): ShiftWindow {
  const tz = config.timezone;
  const parts = getZonedParts(now, tz);
  const eveningStart = parseTimeHHMM(config.eveningStartTime);
  const eveningEnd = parseTimeHHMM(config.eveningEndTime);
  const eveningStartMin = minutesSinceMidnight(eveningStart.hour, eveningStart.minute);
  const eveningEndMin = minutesSinceMidnight(eveningEnd.hour, eveningEnd.minute);
  const nowMin = minutesSinceMidnight(parts.hour, parts.minute);

  let windowBase: Pick<ShiftWindow, 'startsAt' | 'endsAt' | 'serviceDate'>;

  if (kind === ShiftKind.MORNING) {
    windowBase = buildMorningWindow(parts.year, parts.month, parts.day, config);
  } else if (isInEveningWindow(parts, config)) {
    if (nowMin >= eveningStartMin || eveningStartMin <= eveningEndMin) {
      windowBase = buildEveningWindow(parts.year, parts.month, parts.day, config);
    } else {
      const prevDay = addCalendarDays(parts.year, parts.month, parts.day, -1);
      windowBase = buildEveningWindow(prevDay.year, prevDay.month, prevDay.day, config);
    }
  } else {
    windowBase = buildEveningWindow(parts.year, parts.month, parts.day, config);
  }

  const cycleDay = getCycleDay(config.cycleStartDate, windowBase.serviceDate, tz);
  const groups = getGroupsForCycleDay(cycleDay);
  const groupCode = kind === ShiftKind.MORNING ? groups.morning : groups.evening;
  const nextGroupCode = kind === ShiftKind.MORNING ? groups.evening : groups.morning;

  return {
    ...windowBase,
    cycleDay,
    groupCode,
    nextGroupCode,
  };
}

export function msUntilShiftEnd(endsAt: Date, now: Date): number {
  return Math.max(0, endsAt.getTime() - now.getTime());
}

export function getCycleEndDate(cycleStartDate: Date, timezone: string): Date {
  const parts = getZonedParts(cycleStartDate, timezone);
  const end = addCalendarDays(parts.year, parts.month, parts.day, 7);
  return dateOnlyUtc(end.year, end.month, end.day);
}
