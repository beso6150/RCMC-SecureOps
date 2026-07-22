import { IncidentSeverity, PrismaClient } from '@prisma/client';

export const EMERGENCY_PROCEDURE_SEEDS = [
  {
    code: 'EP-FIRE-01',
    name: 'إجراء إخماد حريق أولي',
    incidentTypeCode: 'FIRE',
    severity: IncidentSeverity.CRITICAL,
    description: 'خطوات الاستجابة الأولية عند اكتشاف حريق داخل المجمع.',
    instructionsJson: {
      steps: [
        { title: 'تفعيل إنذار الحريق وإخلاء المنطقة القريبة' },
        { title: 'إبلاغ الدفاع المدني وغرفة العمليات' },
        { title: 'استخدام طفاية مناسبة إن أمكن دون تعريض النفس للخطر' },
        { title: 'تأمين المسارات ومنافذ الطوارئ' },
      ],
    },
  },
  {
    code: 'EP-EVAC-01',
    name: 'إجراء إخلاء جزئي/كامل',
    incidentTypeCode: 'EVACUATION',
    severity: IncidentSeverity.HIGH,
    description: 'تنظيم إخلاء آمن للموظفين والزوار.',
    instructionsJson: {
      steps: [
        { title: 'إعلان الإخلاء عبر القنوات المعتمدة' },
        { title: 'توجيه الأشخاص لنقاط التجمع' },
        { title: 'التأكد من خلو الطوابق بالتفتيش السريع' },
        { title: 'تسجيل الحضور في نقطة التجمع' },
      ],
    },
  },
  {
    code: 'EP-MED-01',
    name: 'استجابة حالة طبية طارئة',
    incidentTypeCode: 'MEDICAL',
    severity: IncidentSeverity.HIGH,
    description: 'إسعاف أولي واتصال بالفريق الطبي.',
    instructionsJson: {
      steps: [
        { title: 'تأمين المشهد ومنع الازدحام' },
        { title: 'تقديم إسعافات أولية ضمن الصلاحية' },
        { title: 'استدعاء الفريق الطبي/الإسعاف' },
        { title: 'توثيق الحالة والوقت' },
      ],
    },
  },
  {
    code: 'EP-SEC-01',
    name: 'تعامل مع شخص مشبوه',
    incidentTypeCode: 'SUSPICIOUS_PERSON',
    severity: IncidentSeverity.HIGH,
    description: 'مراقبة وتأمين دون تصعيد غير ضروري.',
    instructionsJson: {
      steps: [
        { title: 'الرصد من مسافة آمنة وإبلاغ غرفة العمليات' },
        { title: 'طلب دعم ومؤازرة' },
        { title: 'تقييد الوصول للمنطقة إن لزم' },
        { title: 'التنسيق مع المشرف قبل التدخل المباشر' },
      ],
    },
  },
  {
    code: 'EP-VEH-01',
    name: 'مركبة مشبوهة في المواقف',
    incidentTypeCode: 'SUSPICIOUS_VEHICLE',
    severity: IncidentSeverity.HIGH,
    description: 'عزل المنطقة والتنسيق مع CCTV.',
    instructionsJson: {
      steps: [
        { title: 'تسجيل رقم اللوحة والموقع' },
        { title: 'عزل المحيط ومنع الاقتراب' },
        { title: 'طلب تغطية كاميرات المراقبة' },
        { title: 'تصعيد للمشرف عند الاشتباه بوجود خطر' },
      ],
    },
  },
  {
    code: 'EP-ACCESS-01',
    name: 'دخول غير مصرح',
    incidentTypeCode: 'UNAUTHORIZED_ACCESS',
    severity: IncidentSeverity.MEDIUM,
    description: 'احتواء ومحاسبة الدخول غير المصرح.',
    instructionsJson: {
      steps: [
        { title: 'إيقاف الشخص بأسلوب مهني' },
        { title: 'التحقق من الهوية والتصريح' },
        { title: 'تسجيل البلاغ وإبلاغ المشرف' },
        { title: 'مرافقة الشخص خارج المنطقة إن لزم' },
      ],
    },
  },
  {
    code: 'EP-POWER-01',
    name: 'انقطاع كهرباء',
    incidentTypeCode: 'POWER_OUTAGE',
    severity: IncidentSeverity.MEDIUM,
    description: 'تأمين المنشأة أثناء انقطاع التيار.',
    instructionsJson: {
      steps: [
        { title: 'التحقق من نطاق الانقطاع' },
        { title: 'تفعيل الإضاءة الاحتياطية إن وجدت' },
        { title: 'إبلاغ المرافق وغرفة العمليات' },
        { title: 'مراقبة المداخل أثناء الظلام' },
      ],
    },
  },
  {
    code: 'EP-WATER-01',
    name: 'تسرب مياه',
    incidentTypeCode: 'WATER_LEAK',
    severity: IncidentSeverity.MEDIUM,
    description: 'احتواء التسرب وتقليل الأضرار.',
    instructionsJson: {
      steps: [
        { title: 'تحديد مصدر التسرب إن أمكن' },
        { title: 'عزل المنطقة ومنع الانزلاق' },
        { title: 'إبلاغ الصيانة/المرافق' },
        { title: 'توثيق الأضرار بالصور' },
      ],
    },
  },
  {
    code: 'EP-ELEV-01',
    name: 'عطل مصعد مع أشخاص',
    incidentTypeCode: 'ELEVATOR',
    severity: IncidentSeverity.HIGH,
    description: 'تهدئة المحتجزين واستدعاء الصيانة والطوارئ.',
    instructionsJson: {
      steps: [
        { title: 'التواصل مع الركاب عبر نظام النداء' },
        { title: 'منع محاولات الفتح غير الآمنة' },
        { title: 'استدعاء صيانة المصاعد والإسعاف عند الحاجة' },
        { title: 'توثيق الزمن والحالة الصحية' },
      ],
    },
  },
  {
    code: 'EP-CROWD-01',
    name: 'ضبط حشود',
    incidentTypeCode: 'CROWD_CONTROL',
    severity: IncidentSeverity.MEDIUM,
    description: 'تنظيم التدفق ومنع الاختناق.',
    instructionsJson: {
      steps: [
        { title: 'فتح ممرات إضافية وتوجيه التدفق' },
        { title: 'طلب مؤازرة إضافية' },
        { title: 'مراقبة نقاط الاختناق' },
        { title: 'التنسيق مع العمليات لقرار الإخلاء الجزئي' },
      ],
    },
  },
] as const;

export async function seedEmergencyProcedures(
  prisma: PrismaClient,
  createdById: string,
): Promise<number> {
  let count = 0;
  for (const proc of EMERGENCY_PROCEDURE_SEEDS) {
    await prisma.emergencyProcedure.upsert({
      where: { code: proc.code },
      create: {
        code: proc.code,
        name: proc.name,
        incidentTypeCode: proc.incidentTypeCode,
        severity: proc.severity,
        description: proc.description,
        instructionsJson: proc.instructionsJson,
        isActive: true,
        createdById,
      },
      update: {
        name: proc.name,
        incidentTypeCode: proc.incidentTypeCode,
        severity: proc.severity,
        description: proc.description,
        instructionsJson: proc.instructionsJson,
        isActive: true,
        deletedAt: null,
      },
    });
    count += 1;
  }
  return count;
}
