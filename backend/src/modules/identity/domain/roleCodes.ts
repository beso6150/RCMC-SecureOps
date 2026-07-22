export const RoleCodes = {
  SECURITY_GUARD: 'SECURITY_GUARD',
  SECURITY_SUPERVISOR: 'SECURITY_SUPERVISOR',
  CCTV_OPERATOR: 'CCTV_OPERATOR',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SECURITY_DIRECTOR: 'SECURITY_DIRECTOR',
} as const;

export type RoleCode = (typeof RoleCodes)[keyof typeof RoleCodes];

export const SYSTEM_ROLES: Array<{
  code: RoleCode;
  nameEn: string;
  nameAr: string;
  description: string;
}> = [
  {
    code: RoleCodes.SECURITY_GUARD,
    nameEn: 'Security Guard',
    nameAr: 'حارس أمن',
    description: 'Frontline security operations; no access to employee phone numbers',
  },
  {
    code: RoleCodes.SECURITY_SUPERVISOR,
    nameEn: 'Security Supervisor',
    nameAr: 'مشرف أمن',
    description: 'Supervises incidents; phone numbers only when handling incidents',
  },
  {
    code: RoleCodes.CCTV_OPERATOR,
    nameEn: 'CCTV Operator',
    nameAr: 'مشغلة كاميرات المراقبة CCTV',
    description: 'CCTV monitoring room operator — permits, case proofs, and security referrals',
  },
  {
    code: RoleCodes.OPERATIONS_MANAGER,
    nameEn: 'Operations Manager',
    nameAr: 'مدير العمليات',
    description: 'Day-to-day security operations management',
  },
  {
    code: RoleCodes.PROJECT_MANAGER,
    nameEn: 'Project Manager',
    nameAr: 'مدير المشروع',
    description: 'Project oversight; complaints module is read-only',
  },
  {
    code: RoleCodes.SECURITY_DIRECTOR,
    nameEn: 'Security Director',
    nameAr: 'المدير الأمني',
    description: 'Full system permissions',
  },
];
