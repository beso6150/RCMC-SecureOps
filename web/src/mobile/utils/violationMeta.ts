import type { MobileCaseType } from '../config/violationCaseConfig';

export interface ViolationCaseMeta {
  caseType: MobileCaseType;
  reasonCode: string;
  reasonLabel: string;
  vehicleType?: string | null;
  hasPermit: boolean;
  permitNumber?: string | null;
  employeeId?: string | null;
  employeeName?: string | null;
  employeePhone?: string | null;
  highPriority?: boolean;
  version: 1;
}

const META_START = '---RCMC_META---';
const META_END = '---RCMC_META_END---';

export function encodeViolationNotes(meta: ViolationCaseMeta, freeNotes: string): string {
  const block = `${META_START}\n${JSON.stringify(meta)}\n${META_END}`;
  const trimmed = freeNotes.trim();
  return trimmed ? `${block}\n${trimmed}` : block;
}

export function parseViolationNotes(notes: string | null | undefined): {
  meta: ViolationCaseMeta | null;
  freeNotes: string;
} {
  if (!notes) return { meta: null, freeNotes: '' };
  const start = notes.indexOf(META_START);
  const end = notes.indexOf(META_END);
  if (start === -1 || end === -1 || end <= start) {
    return { meta: null, freeNotes: notes };
  }
  const jsonPart = notes.slice(start + META_START.length, end).trim();
  const freeNotes = notes.slice(end + META_END.length).trim();
  try {
    const meta = JSON.parse(jsonPart) as ViolationCaseMeta;
    return { meta, freeNotes };
  } catch {
    return { meta: null, freeNotes: notes };
  }
}
