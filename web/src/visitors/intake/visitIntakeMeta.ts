import type { VisitIntakeMeta } from '../../types/visitIntake';

const META_START = '---VISIT_INTAKE---';
const META_END = '---VISIT_INTAKE_END---';

export function encodeVisitPurpose(meta: VisitIntakeMeta, freePurpose: string): string {
  const block = `${META_START}\n${JSON.stringify(meta)}\n${META_END}`;
  const trimmed = freePurpose.trim();
  return trimmed ? `${block}\n${trimmed}` : block;
}

export function parseVisitPurpose(purpose: string | null | undefined): {
  meta: VisitIntakeMeta | null;
  freePurpose: string;
} {
  if (!purpose) return { meta: null, freePurpose: '' };
  const start = purpose.indexOf(META_START);
  const end = purpose.indexOf(META_END);
  if (start === -1 || end === -1 || end <= start) {
    return { meta: null, freePurpose: purpose };
  }
  const jsonPart = purpose.slice(start + META_START.length, end).trim();
  const freePurpose = purpose.slice(end + META_END.length).trim();
  try {
    return { meta: JSON.parse(jsonPart) as VisitIntakeMeta, freePurpose };
  } catch {
    return { meta: null, freePurpose: purpose };
  }
}
