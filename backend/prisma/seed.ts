import { PrismaClient, UserStatus, NotificationPriority, TaskPriority, TaskStatus, VehiclePermitStatus, ComplaintStatus, OperationalStatus, CheckpointType, SecurityZoneType } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  PERMISSION_CATALOG,
  ROLE_PERMISSION_GRANTS,
  PermissionCodes,
} from '../src/modules/identity/domain/permissionCodes';
import { SYSTEM_ROLES } from '../src/modules/identity/domain/roleCodes';
import { DEFAULT_INCIDENT_TYPES } from '../src/modules/incidents/domain/constants';
import { INCIDENT_ESCALATION_SYSTEM_SETTINGS } from '../src/modules/incidents/domain/constants';
import { seedEmergencyProcedures } from '../src/modules/incidents/application/seedEmergencyProcedures';
import { DEFAULT_SYSTEM_SETTINGS } from '../src/modules/settings/application/SettingsService';
import { FIELD_OPS_SYSTEM_SETTINGS } from '../src/modules/field-operations/application/fieldOpsSettings';
import { MOBILE_SYSTEM_SETTINGS } from '../src/modules/mobile/application/mobileSettings';
import { SHIFT_GROUP_SEED } from '../src/modules/shifts/domain/constants';
import { notificationRuleService } from '../src/modules/notifications/application/NotificationRuleService';
const prisma = new PrismaClient();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

async function seed() {
  console.log('Seeding RCMC SecureOps IAM...');

  // Roles
  const roleByCode = new Map<string, string>();
  for (const role of SYSTEM_ROLES) {
    const upserted = await prisma.role.upsert({
      where: { code: role.code },
      create: {
        code: role.code,
        nameEn: role.nameEn,
        nameAr: role.nameAr,
        description: role.description,
        isSystem: true,
      },
      update: {
        nameEn: role.nameEn,
        nameAr: role.nameAr,
        description: role.description,
        deletedAt: null,
      },
    });
    roleByCode.set(role.code, upserted.id);
  }
  console.log(`Roles: ${roleByCode.size}`);

  // Permissions
  const permissionByCode = new Map<string, string>();
  for (const perm of PERMISSION_CATALOG) {
    const upserted = await prisma.permission.upsert({
      where: { code: perm.code },
      create: {
        code: perm.code,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
      },
      update: {
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        deletedAt: null,
      },
    });
    permissionByCode.set(perm.code, upserted.id);
  }
  console.log(`Permissions: ${permissionByCode.size}`);

  // Role ↔ Permission grants
  for (const [roleCode, codes] of Object.entries(ROLE_PERMISSION_GRANTS)) {
    const roleId = roleByCode.get(roleCode);
    if (!roleId) continue;

    await prisma.rolePermission.deleteMany({ where: { roleId } });

    const data = codes
      .map((code) => permissionByCode.get(code))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId, permissionId }));

    if (data.length > 0) {
      await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
    console.log(`  ${roleCode}: ${data.length} permissions`);
  }

  // PermissionPolicy: Security Supervisor phone only during incident handling
  const readPhoneId = permissionByCode.get(PermissionCodes.USERS_READ_PHONE);
  if (readPhoneId) {
    const existing = await prisma.permissionPolicy.findFirst({
      where: {
        permissionId: readPhoneId,
        name: 'Supervisor phone — incident handling only',
        deletedAt: null,
      },
    });

    if (!existing) {
      await prisma.permissionPolicy.create({
        data: {
          permissionId: readPhoneId,
          name: 'Supervisor phone — incident handling only',
          description:
            'Deny users:read_phone for Security Supervisor unless context.incidentHandling=true',
          conditions: {
            effect: 'deny',
            appliesToRoles: ['SECURITY_SUPERVISOR'],
            when: {
              field: 'phone',
              unless: 'context.incidentHandling',
            },
          },
          priority: 10,
          isActive: true,
        },
      });
      console.log('Created phone PermissionPolicy for incident handling');
    }
  }

  // Sample department & shift
  const department = await prisma.department.upsert({
    where: { code: 'SEC' },
    create: {
      code: 'SEC',
      nameEn: 'Security',
      nameAr: 'الأمن',
      description: 'Security department',
    },
    update: { deletedAt: null },
  });

  const shift = await prisma.shift.upsert({
    where: { code: 'DAY' },
    create: {
      code: 'DAY',
      nameEn: 'Day Shift',
      nameAr: 'وردية صباحية',
      startTime: '08:00',
      endTime: '16:00',
      timezone: 'Asia/Riyadh',
    },
    update: { deletedAt: null },
  });

  const morningShift = await prisma.shift.upsert({
    where: { code: 'MORNING' },
    create: {
      code: 'MORNING',
      nameEn: 'Morning Shift',
      nameAr: 'وردية صباحية',
      startTime: '06:00',
      endTime: '18:00',
      timezone: 'Asia/Riyadh',
    },
    update: {
      nameEn: 'Morning Shift',
      nameAr: 'وردية صباحية',
      startTime: '06:00',
      endTime: '18:00',
      deletedAt: null,
    },
  });

  await prisma.shift.upsert({
    where: { code: 'EVENING' },
    create: {
      code: 'EVENING',
      nameEn: 'Evening Shift',
      nameAr: 'وردية مسائية',
      startTime: '18:00',
      endTime: '06:00',
      timezone: 'Asia/Riyadh',
    },
    update: {
      nameEn: 'Evening Shift',
      nameAr: 'وردية مسائية',
      startTime: '18:00',
      endTime: '06:00',
      deletedAt: null,
    },
  });
  console.log('Shifts: DAY (legacy), MORNING, EVENING');

  const groupByCode = new Map<string, string>();
  for (const seed of SHIFT_GROUP_SEED) {
    const group = await prisma.shiftGroup.upsert({
      where: { code: seed.code },
      create: {
        code: seed.code,
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
      },
      update: {
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        deletedAt: null,
      },
    });
    groupByCode.set(seed.code, group.id);
  }
  console.log(`Shift groups: ${groupByCode.size}`);

  const timezone = 'Asia/Riyadh';
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay();
  const diffToSunday = day === 0 ? 0 : day;
  weekStart.setDate(weekStart.getDate() - diffToSunday);
  weekStart.setHours(0, 0, 0, 0);
  const cycleStartDate = new Date(
    Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()),
  );

  const existingCycleConfig = await prisma.shiftCycleConfig.findFirst({
    orderBy: { createdAt: 'asc' },
  });
  if (existingCycleConfig) {
    await prisma.shiftCycleConfig.update({
      where: { id: existingCycleConfig.id },
      data: {
        cycleStartDate,
        morningStartTime: '06:00',
        morningEndTime: '18:00',
        eveningStartTime: '18:00',
        eveningEndTime: '06:00',
        timezone,
      },
    });
  } else {
    await prisma.shiftCycleConfig.create({
      data: {
        cycleStartDate,
        morningStartTime: '06:00',
        morningEndTime: '18:00',
        eveningStartTime: '18:00',
        eveningEndTime: '06:00',
        timezone,
      },
    });
  }
  console.log(`Shift cycle config: start=${cycleStartDate.toISOString().slice(0, 10)}`);

  const groupAId = groupByCode.get('A');
  const groupBId = groupByCode.get('B');

  // Bootstrap Security Director (first login forced)
  const directorRoleId = roleByCode.get('SECURITY_DIRECTOR');
  if (directorRoleId) {
    const nationalId = '1000000001';
    const employeeNumber = 'EMP-DIR-001';
    const passwordHash = await bcrypt.hash(employeeNumber, BCRYPT_ROUNDS);

    await prisma.user.upsert({
      where: { nationalId },
      create: {
        nationalId,
        employeeNumber,
        fullName: 'Security Director',
        email: 'director@rcmc.local',
        phone: '+966500000001',
        jobTitle: 'Security Director',
        passwordHash,
        status: UserStatus.PENDING_FIRST_LOGIN,
        isFirstLogin: true,
        roleId: directorRoleId,
        departmentId: department.id,
        shiftId: morningShift.id,
        groupId: groupAId,
      },
      update: {
        deletedAt: null,
        roleId: directorRoleId,
        departmentId: department.id,
        shiftId: morningShift.id,
        groupId: groupAId,
      },
    });
    console.log(`Bootstrap director: nationalId=${nationalId} employeeNumber=${employeeNumber}`);
  }

  // Sample Security Guard (no phone access)
  const guardRoleId = roleByCode.get('SECURITY_GUARD');
  let guardUserId: string | undefined;
  if (guardRoleId) {
    const nationalId = '1000000002';
    const employeeNumber = 'EMP-GRD-001';
    const passwordHash = await bcrypt.hash(employeeNumber, BCRYPT_ROUNDS);

    const guardUser = await prisma.user.upsert({
      where: { nationalId },
      create: {
        nationalId,
        employeeNumber,
        fullName: 'Security Guard One',
        email: 'guard1@rcmc.local',
        phone: '+966500000002',
        jobTitle: 'Security Guard',
        passwordHash,
        status: UserStatus.PENDING_FIRST_LOGIN,
        isFirstLogin: true,
        roleId: guardRoleId,
        departmentId: department.id,
        shiftId: morningShift.id,
        groupId: groupAId,
        operationalStatus: OperationalStatus.ON_DUTY,
      },
      update: {
        deletedAt: null,
        roleId: guardRoleId,
        shiftId: morningShift.id,
        groupId: groupAId,
        operationalStatus: OperationalStatus.ON_DUTY,
      },
    });
    guardUserId = guardUser.id;
    console.log(`Bootstrap guard: nationalId=${nationalId} employeeNumber=${employeeNumber}`);
  }

  // Sample Security Supervisor
  const supervisorRoleId = roleByCode.get('SECURITY_SUPERVISOR');
  let supervisorUserId: string | undefined;
  if (supervisorRoleId) {
    const nationalId = '1000000003';
    const employeeNumber = 'EMP-SUP-001';
    const passwordHash = await bcrypt.hash(employeeNumber, BCRYPT_ROUNDS);

    const supervisorUser = await prisma.user.upsert({
      where: { nationalId },
      create: {
        nationalId,
        employeeNumber,
        fullName: 'Security Supervisor One',
        email: 'supervisor1@rcmc.local',
        phone: '+966500000003',
        jobTitle: 'Security Supervisor',
        passwordHash,
        status: UserStatus.PENDING_FIRST_LOGIN,
        isFirstLogin: true,
        roleId: supervisorRoleId,
        departmentId: department.id,
        shiftId: morningShift.id,
        groupId: groupAId,
        operationalStatus: OperationalStatus.ON_DUTY,
      },
      update: {
        deletedAt: null,
        roleId: supervisorRoleId,
        shiftId: morningShift.id,
        groupId: groupAId,
        operationalStatus: OperationalStatus.ON_DUTY,
      },
    });
    supervisorUserId = supervisorUser.id;
    console.log(`Bootstrap supervisor: nationalId=${nationalId} employeeNumber=${employeeNumber}`);
  }

  // Sample CCTV Operator (fallback assignee)
  const cctvRoleId = roleByCode.get('CCTV_OPERATOR');
  if (cctvRoleId) {
    const nationalId = '1000000004';
    const employeeNumber = 'EMP-CCTV-001';
    const passwordHash = await bcrypt.hash(employeeNumber, BCRYPT_ROUNDS);

    await prisma.user.upsert({
      where: { nationalId },
      create: {
        nationalId,
        employeeNumber,
        fullName: 'CCTV Operator One',
        email: 'cctv1@rcmc.local',
        phone: '+966500000004',
        jobTitle: 'CCTV Operator',
        passwordHash,
        status: UserStatus.PENDING_FIRST_LOGIN,
        isFirstLogin: true,
        roleId: cctvRoleId,
        departmentId: department.id,
        shiftId: morningShift.id,
        groupId: groupBId,
      },
      update: {
        deletedAt: null,
        roleId: cctvRoleId,
        shiftId: morningShift.id,
        groupId: groupBId,
      },
    });
    console.log(`Bootstrap CCTV: nationalId=${nationalId} employeeNumber=${employeeNumber}`);
  }

  // Sample Operations Manager
  const opsRoleId = roleByCode.get('OPERATIONS_MANAGER');
  if (opsRoleId) {
    const nationalId = '1000000005';
    const employeeNumber = 'EMP-OPS-001';
    const passwordHash = await bcrypt.hash(employeeNumber, BCRYPT_ROUNDS);

    await prisma.user.upsert({
      where: { nationalId },
      create: {
        nationalId,
        employeeNumber,
        fullName: 'Operations Manager One',
        email: 'ops1@rcmc.local',
        phone: '+966500000005',
        jobTitle: 'Operations Manager',
        passwordHash,
        status: UserStatus.PENDING_FIRST_LOGIN,
        isFirstLogin: true,
        roleId: opsRoleId,
        departmentId: department.id,
        shiftId: morningShift.id,
        groupId: groupAId,
        operationalStatus: OperationalStatus.ON_DUTY,
      },
      update: {
        deletedAt: null,
        roleId: opsRoleId,
        shiftId: morningShift.id,
        groupId: groupAId,
        operationalStatus: OperationalStatus.ON_DUTY,
      },
    });
    console.log(`Bootstrap ops manager: nationalId=${nationalId} employeeNumber=${employeeNumber}`);
  }

  // Parking locations: Ground / Basement / West
  const parkingBuilding = await prisma.building.upsert({
    where: { code: 'PARKING' },
    create: {
      code: 'PARKING',
      nameEn: 'Parking Complex',
      nameAr: 'مجمع المواقف',
      address: 'RCMC Campus',
    },
    update: { deletedAt: null },
  });

  const parkingFloor = await prisma.floor.upsert({
    where: {
      buildingId_code: { buildingId: parkingBuilding.id, code: 'P0' },
    },
    create: {
      buildingId: parkingBuilding.id,
      code: 'P0',
      nameEn: 'Parking Level',
      nameAr: 'مستوى المواقف',
      level: 0,
    },
    update: { deletedAt: null },
  });

  const parkingSpots = [
    { code: 'GROUND_PARKING', nameEn: 'Ground Parking', nameAr: 'موقف الأرضي' },
    { code: 'BASEMENT_PARKING', nameEn: 'Basement Parking', nameAr: 'موقف السرداب' },
    { code: 'WEST_PARKING', nameEn: 'West Parking', nameAr: 'موقف الغرب' },
  ] as const;

  for (const spot of parkingSpots) {
    const existing = await prisma.location.findFirst({
      where: { floorId: parkingFloor.id, code: spot.code },
    });
    if (existing) {
      await prisma.location.update({
        where: { id: existing.id },
        data: {
          nameEn: spot.nameEn,
          nameAr: spot.nameAr,
          deletedAt: null,
        },
      });
    } else {
      await prisma.location.create({
        data: {
          floorId: parkingFloor.id,
          code: spot.code,
          nameEn: spot.nameEn,
          nameAr: spot.nameAr,
          description: `Official parking location: ${spot.nameEn}`,
        },
      });
    }
  }
  console.log('Parking locations: Ground, Basement, West');

  // Campus building + floors + meeting rooms for visitors module
  const campus = await prisma.building.upsert({
    where: { code: 'MAIN' },
    create: {
      code: 'MAIN',
      nameEn: 'Main Building',
      nameAr: 'المبنى الرئيسي',
      address: 'RCMC Campus',
    },
    update: { deletedAt: null },
  });

  const floorsSeed = [
    { code: 'F1', nameEn: 'Floor 1', nameAr: 'الطابق الأول', level: 1 },
    { code: 'F2', nameEn: 'Floor 2', nameAr: 'الطابق الثاني', level: 2 },
    { code: 'F3', nameEn: 'Floor 3', nameAr: 'الطابق الثالث', level: 3 },
  ] as const;

  const floorIds: string[] = [];
  for (const f of floorsSeed) {
    const floor = await prisma.floor.upsert({
      where: { buildingId_code: { buildingId: campus.id, code: f.code } },
      create: {
        buildingId: campus.id,
        code: f.code,
        nameEn: f.nameEn,
        nameAr: f.nameAr,
        level: f.level,
      },
      update: { deletedAt: null, nameEn: f.nameEn, nameAr: f.nameAr },
    });
    floorIds.push(floor.id);

    const rooms = [
      { code: 'MR-A', nameEn: `Meeting Room A (${f.code})`, nameAr: `قاعة اجتماعات أ (${f.code})`, capacity: 12 },
      { code: 'MR-B', nameEn: `Meeting Room B (${f.code})`, nameAr: `قاعة اجتماعات ب (${f.code})`, capacity: 20 },
    ];
    for (const room of rooms) {
      const existing = await prisma.meetingRoom.findFirst({
        where: { floorId: floor.id, code: room.code },
      });
      if (existing) {
        await prisma.meetingRoom.update({
          where: { id: existing.id },
          data: {
            nameEn: room.nameEn,
            nameAr: room.nameAr,
            capacity: room.capacity,
            deletedAt: null,
            isActive: true,
          },
        });
      } else {
        await prisma.meetingRoom.create({
          data: {
            floorId: floor.id,
            code: room.code,
            nameEn: room.nameEn,
            nameAr: room.nameAr,
            capacity: room.capacity,
          },
        });
      }
    }
  }
  console.log(`Campus floors/meeting rooms seeded: ${floorIds.length} floors`);

  // Sample host linked to Security department
  const sampleHost = await prisma.host.upsert({
    where: { employeeNumber: 'EMP-HOST-001' },
    create: {
      employeeNumber: 'EMP-HOST-001',
      employeeName: 'Dr. Ahmed Al-Rashid',
      departmentId: department.id,
      phone: '+966501112233',
      email: 'ahmed.alrashid@rcmc.gov.sa',
      communicationPreference: 'WHATSAPP',
      whatsappEnabled: true,
      phoneCallEnabled: true,
    },
    update: {
      deletedAt: null,
      employeeName: 'Dr. Ahmed Al-Rashid',
      departmentId: department.id,
      phone: '+966501112233',
      communicationPreference: 'BOTH',
      whatsappEnabled: true,
      phoneCallEnabled: true,
    },
  });
  console.log(`Sample host: ${sampleHost.employeeNumber}`);

  // Default incident types
  for (const incidentType of DEFAULT_INCIDENT_TYPES) {
    await prisma.incidentType.upsert({
      where: { code: incidentType.code },
      create: {
        code: incidentType.code,
        nameAr: incidentType.nameAr,
        nameEn: incidentType.nameEn,
        sortOrder: incidentType.sortOrder,
        isActive: true,
      },
      update: {
        nameAr: incidentType.nameAr,
        nameEn: incidentType.nameEn,
        sortOrder: incidentType.sortOrder,
        isActive: true,
        deletedAt: null,
      },
    });
  }
  console.log(`Incident types: ${DEFAULT_INCIDENT_TYPES.length}`);

  // Sample inbox notifications & tasks (Sprint 10)
  if (guardUserId && supervisorUserId) {
    const notificationSeeds = [
      {
        userId: guardUserId,
        senderId: supervisorUserId,
        title: 'تذكير دورية',
        body: 'يرجى إكمال جولة التفتيش في موقف الغرب قبل نهاية الوردية.',
        priority: NotificationPriority.NORMAL,
      },
      {
        userId: guardUserId,
        senderId: supervisorUserId,
        title: 'مهمة جديدة',
        body: 'تم تعيين مهمة متابعة زائر VIP في الطابق الثاني.',
        priority: NotificationPriority.HIGH,
      },
      {
        userId: supervisorUserId,
        title: 'تقرير يومي',
        body: 'تم تسجيل 3 مخالفات مرورية اليوم.',
        priority: NotificationPriority.LOW,
      },
    ];

    for (const n of notificationSeeds) {
      const existing = await prisma.notification.findFirst({
        where: { userId: n.userId, title: n.title, deletedAt: null },
      });
      if (!existing) {
        await prisma.notification.create({ data: n });
      }
    }

    const taskSeeds = [
      {
        title: 'جولة تفتيش موقف الغرب',
        description: 'التأكد من الالتزام بلوحات المواقف المخصصة وتوثيق أي مخالفات.',
        assigneeId: guardUserId,
        assignerId: supervisorUserId,
        priority: TaskPriority.HIGH,
        status: TaskStatus.PENDING,
        dueAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
      },
      {
        title: 'متابعة بلاغ حادث',
        description: 'مراجعة بلاغ الحادث المفتوح والتأكد من تحديث الحالة.',
        assigneeId: supervisorUserId,
        assignerId: supervisorUserId,
        priority: TaskPriority.NORMAL,
        status: TaskStatus.IN_PROGRESS,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    ];

    for (const t of taskSeeds) {
      const existing = await prisma.task.findFirst({
        where: { title: t.title, assigneeId: t.assigneeId, deletedAt: null },
      });
      if (!existing) {
        await prisma.task.create({ data: t });
      }
    }

    console.log('Sample notifications and tasks seeded for guard/supervisor');
  }

  // Sprint 12: Vehicle permits + pending camera requests
  const groundLocation = await prisma.location.findFirst({
    where: { code: 'GROUND_PARKING', deletedAt: null },
  });
  const basementLocation = await prisma.location.findFirst({
    where: { code: 'BASEMENT_PARKING', deletedAt: null },
  });

  const directorUser = await prisma.user.findFirst({
    where: { employeeNumber: 'EMP-DIR-001', deletedAt: null },
  });

  if (groundLocation && basementLocation) {
    const now = new Date();
    const validFrom = new Date(now);
    validFrom.setMonth(validFrom.getMonth() - 1);
    const validTo = new Date(now);
    validTo.setMonth(validTo.getMonth() + 11);

    const permitSeeds = [
      {
        plateNumber: 'ABC-1234',
        vehicleType: 'Sedan',
        ownerName: 'Mohammed Al-Qahtani',
        ownerPhone: '+966501234567',
        locationId: groundLocation.id,
        status: VehiclePermitStatus.APPROVED,
      },
      {
        plateNumber: 'XYZ-5678',
        vehicleType: 'SUV',
        ownerName: 'Sara Al-Otaibi',
        ownerPhone: '+966509876543',
        locationId: basementLocation.id,
        status: VehiclePermitStatus.APPROVED,
      },
      {
        plateNumber: 'RCM-9999',
        vehicleType: 'Pickup',
        ownerName: 'Contractor Fleet',
        ownerPhone: '+966505555555',
        locationId: groundLocation.id,
        status: VehiclePermitStatus.PENDING,
      },
    ];

    for (const p of permitSeeds) {
      const existing = await prisma.vehiclePermit.findFirst({
        where: { plateNumber: p.plateNumber, deletedAt: null },
      });
      if (!existing) {
        await prisma.vehiclePermit.create({
          data: {
            ...p,
            validFrom,
            validTo,
            approvedById: p.status === VehiclePermitStatus.APPROVED ? directorUser?.id : null,
            notes: 'Seeded permit for CCTV control room testing',
          },
        });
      }
    }
    console.log('Vehicle permits seeded: ABC-1234, XYZ-5678, RCM-9999');
  }

  if (supervisorUserId) {
    const cameraRequestSeeds = [
      {
        plateNumber: 'DEF-4321',
        notes: 'Supervisor request — verify employee parking permit at west gate',
      },
      {
        plateNumber: 'GHI-8765',
        notes: 'Urgent lookup for visitor vehicle at main entrance',
      },
    ];

    for (const cr of cameraRequestSeeds) {
      const existing = await prisma.cameraRequest.findFirst({
        where: {
          plateNumber: cr.plateNumber,
          requestedById: supervisorUserId,
          deletedAt: null,
        },
      });
      if (!existing) {
        await prisma.cameraRequest.create({
          data: {
            plateNumber: cr.plateNumber,
            notes: cr.notes,
            requestedById: supervisorUserId,
          },
        });
      }
    }
    console.log('Pending camera requests seeded for supervisor');
  }

  // Sprint 13 + 17: System settings defaults
  const allSettings = [...DEFAULT_SYSTEM_SETTINGS, ...INCIDENT_ESCALATION_SYSTEM_SETTINGS];
  for (const setting of allSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isPublic: setting.isPublic,
      },
      update: {
        description: setting.description,
        isPublic: setting.isPublic,
        deletedAt: null,
      },
    });
  }
  console.log(`System settings: ${allSettings.length}`);

  // Sprint 17: Emergency procedures (no fake incidents)
  const procedureCreator =
    (await prisma.user.findFirst({
      where: { employeeNumber: 'EMP-OPS-001', deletedAt: null },
    })) ??
    (await prisma.user.findFirst({
      where: { employeeNumber: 'EMP-DIR-001', deletedAt: null },
    }));
  if (procedureCreator) {
    const n = await seedEmergencyProcedures(prisma, procedureCreator.id);
    console.log(`Emergency procedures: ${n}`);
  }

  // Sprint 13: Sample complaints
  const opsManagerUser = await prisma.user.findFirst({
    where: { employeeNumber: 'EMP-OPS-001', deletedAt: null },
  });
  const supervisorForComplaints = await prisma.user.findFirst({
    where: { employeeNumber: 'EMP-SUP-001', deletedAt: null },
  });
const complaintGroundLocation = await prisma.location.findFirst({
    where: { code: 'GROUND_PARKING', deletedAt: null },
  });

  const complaintSeeds = [
    {
      title: 'Noise complaint — west parking',
      description: 'Repeated loud vehicle alarms after hours near the west parking gate.',
      status: ComplaintStatus.SUBMITTED,
      submitterId: opsManagerUser?.id ?? directorUser?.id,
locationId: complaintGroundLocation?.id ?? null,
    },
    {
      title: 'Broken lighting — basement corridor',
      description: 'Several lights are out in the basement corridor affecting patrol visibility.',
      status: ComplaintStatus.UNDER_REVIEW,
      submitterId: supervisorForComplaints?.id ?? directorUser?.id,
      locationId: null,
    },
    {
      title: 'Unauthorized vendor access',
      description: 'Vendor entered without escort; prior warning issued last week.',
      status: ComplaintStatus.APPROVED,
      submitterId: opsManagerUser?.id ?? directorUser?.id,
      locationId: null,
      reviewNotes: 'Escalated to operations for badge review.',
    },
  ];

  for (const c of complaintSeeds) {
    if (!c.submitterId) continue;
    const existing = await prisma.complaint.findFirst({
      where: { title: c.title, deletedAt: null },
    });
    if (!existing) {
      await prisma.complaint.create({
        data: {
          title: c.title,
          description: c.description,
          status: c.status,
          submitterId: c.submitterId,
          locationId: c.locationId,
          reviewNotes: 'reviewNotes' in c ? c.reviewNotes : null,
          reviewerId:
            c.status !== ComplaintStatus.SUBMITTED ? directorUser?.id ?? null : null,
          reviewedAt: c.status !== ComplaintStatus.SUBMITTED ? new Date() : null,
        },
      });
    }
  }
  console.log('Sample complaints seeded');

  // Sprint 15: Field operations map — zones, checkpoints, routes, settings
  for (const setting of FIELD_OPS_SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isPublic: setting.isPublic,
      },
      update: {
        description: setting.description,
        isPublic: setting.isPublic,
        deletedAt: null,
      },
    });
  }
  console.log(`Field ops settings: ${FIELD_OPS_SYSTEM_SETTINGS.length}`);

  // Sprint 20: Mobile offline sync settings (Asia/Riyadh) — no fake devices/sync ops
  for (const setting of MOBILE_SYSTEM_SETTINGS) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        isPublic: setting.isPublic,
      },
      update: {
        description: setting.description,
        isPublic: setting.isPublic,
        deletedAt: null,
      },
    });
  }
  console.log(`Mobile settings: ${MOBILE_SYSTEM_SETTINGS.length}`);

  const mainBuilding = await prisma.securityZone.upsert({
    where: { code: 'MAIN_BUILDING' },
    create: {
      code: 'MAIN_BUILDING',
      name: 'المبنى الرئيسي',
      description: 'المبنى الرئيسي لمركز الرياض للقلب',
      zoneType: SecurityZoneType.BUILDING,
      mapX: 200,
      mapY: 80,
      width: 400,
      height: 320,
      color: '#0f766e',
    },
    update: {
      name: 'المبنى الرئيسي',
      zoneType: SecurityZoneType.BUILDING,
      mapX: 200,
      mapY: 80,
      width: 400,
      height: 320,
      color: '#0f766e',
      isActive: true,
    },
  });

  const floorSeeds = [
    { code: 'FLOOR_G', name: 'الدور الأرضي', floorNumber: 0, mapY: 320, color: '#14b8a6' },
    { code: 'FLOOR_1', name: 'الدور الأول', floorNumber: 1, mapY: 240, color: '#0d9488' },
    { code: 'FLOOR_2', name: 'الدور الثاني', floorNumber: 2, mapY: 160, color: '#0f766e' },
    { code: 'FLOOR_3', name: 'الدور الثالث', floorNumber: 3, mapY: 80, color: '#115e59' },
  ] as const;

  const floorByCode = new Map<string, string>();
  for (const f of floorSeeds) {
    const zone = await prisma.securityZone.upsert({
      where: { code: f.code },
      create: {
        code: f.code,
        name: f.name,
        zoneType: SecurityZoneType.FLOOR,
        parentId: mainBuilding.id,
        floorNumber: f.floorNumber,
        mapX: 220,
        mapY: f.mapY,
        width: 360,
        height: 70,
        color: f.color,
      },
      update: {
        name: f.name,
        parentId: mainBuilding.id,
        floorNumber: f.floorNumber,
        mapX: 220,
        mapY: f.mapY,
        width: 360,
        height: 70,
        color: f.color,
        isActive: true,
      },
    });
    floorByCode.set(f.code, zone.id);
  }

  const parkingSeeds = [
    {
      code: 'GROUND_PARKING',
      name: 'المواقف الأرضية',
      mapX: 40,
      mapY: 320,
      width: 140,
      height: 100,
      color: '#0369a1',
    },
    {
      code: 'BASEMENT_P1',
      name: 'مواقف البيسمنت P1',
      mapX: 40,
      mapY: 200,
      width: 140,
      height: 90,
      color: '#075985',
    },
    {
      code: 'BASEMENT_P2',
      name: 'مواقف البيسمنت P2',
      mapX: 40,
      mapY: 90,
      width: 140,
      height: 90,
      color: '#0c4a6e',
    },
    {
      code: 'WEST_PARKING',
      name: 'المواقف الغربية',
      mapX: 620,
      mapY: 200,
      width: 140,
      height: 160,
      color: '#1d4ed8',
    },
  ] as const;

  const parkingByCode = new Map<string, string>();
  for (const p of parkingSeeds) {
    const zone = await prisma.securityZone.upsert({
      where: { code: p.code },
      create: {
        code: p.code,
        name: p.name,
        zoneType: SecurityZoneType.PARKING,
        mapX: p.mapX,
        mapY: p.mapY,
        width: p.width,
        height: p.height,
        color: p.color,
      },
      update: {
        name: p.name,
        zoneType: SecurityZoneType.PARKING,
        mapX: p.mapX,
        mapY: p.mapY,
        width: p.width,
        height: p.height,
        color: p.color,
        isActive: true,
      },
    });
    parkingByCode.set(p.code, zone.id);
  }

  const checkpointSeeds = [
    {
      code: 'MAIN_ENTRANCE',
      name: 'المدخل الرئيسي',
      zoneCode: 'FLOOR_G',
      checkpointType: CheckpointType.ENTRANCE,
      mapX: 400,
      mapY: 350,
    },
    {
      code: 'STAFF_ENTRANCE',
      name: 'مدخل الموظفين',
      zoneCode: 'FLOOR_G',
      checkpointType: CheckpointType.ENTRANCE,
      mapX: 250,
      mapY: 350,
    },
    {
      code: 'GROUND_PARKING_GATE',
      name: 'بوابة موقف الأرضي',
      zoneCode: 'GROUND_PARKING',
      checkpointType: CheckpointType.PARKING_POINT,
      mapX: 110,
      mapY: 370,
    },
    {
      code: 'BASEMENT_P1_ENTRANCE',
      name: 'مدخل قبو P1',
      zoneCode: 'BASEMENT_P1',
      checkpointType: CheckpointType.PARKING_POINT,
      mapX: 110,
      mapY: 245,
    },
    {
      code: 'BASEMENT_P2_ENTRANCE',
      name: 'مدخل قبو P2',
      zoneCode: 'BASEMENT_P2',
      checkpointType: CheckpointType.PARKING_POINT,
      mapX: 110,
      mapY: 135,
    },
    {
      code: 'WEST_PARKING_GATE',
      name: 'بوابة الموقف الغربي',
      zoneCode: 'WEST_PARKING',
      checkpointType: CheckpointType.PARKING_POINT,
      mapX: 690,
      mapY: 280,
    },
    {
      code: 'FLOOR_G_POINT',
      name: 'نقطة الدور الأرضي',
      zoneCode: 'FLOOR_G',
      checkpointType: CheckpointType.FLOOR_POINT,
      mapX: 400,
      mapY: 355,
    },
    {
      code: 'FLOOR_1_POINT',
      name: 'نقطة الدور الأول',
      zoneCode: 'FLOOR_1',
      checkpointType: CheckpointType.FLOOR_POINT,
      mapX: 400,
      mapY: 275,
    },
    {
      code: 'FLOOR_2_POINT',
      name: 'نقطة الدور الثاني',
      zoneCode: 'FLOOR_2',
      checkpointType: CheckpointType.FLOOR_POINT,
      mapX: 400,
      mapY: 195,
    },
    {
      code: 'FLOOR_3_POINT',
      name: 'نقطة الدور الثالث',
      zoneCode: 'FLOOR_3',
      checkpointType: CheckpointType.FLOOR_POINT,
      mapX: 400,
      mapY: 115,
    },
  ] as const;

  const zoneIdByCode = new Map<string, string>([
    ...floorByCode,
    ...parkingByCode,
    ['MAIN_BUILDING', mainBuilding.id],
  ]);

  const checkpointByCode = new Map<string, string>();
  for (const cp of checkpointSeeds) {
    const zoneId = zoneIdByCode.get(cp.zoneCode);
    if (!zoneId) continue;
    const qrCodeValue = `QR-RCMC-${cp.code}`;
    const row = await prisma.securityCheckpoint.upsert({
      where: { code: cp.code },
      create: {
        code: cp.code,
        name: cp.name,
        zoneId,
        checkpointType: cp.checkpointType,
        mapX: cp.mapX,
        mapY: cp.mapY,
        qrCodeValue,
        requiredForPatrol: true,
      },
      update: {
        name: cp.name,
        zoneId,
        checkpointType: cp.checkpointType,
        mapX: cp.mapX,
        mapY: cp.mapY,
        qrCodeValue,
        requiredForPatrol: true,
        isActive: true,
      },
    });
    checkpointByCode.set(cp.code, row.id);
  }
  console.log(`Security checkpoints: ${checkpointByCode.size}`);

  const buildingCheckpointCodes = [
    'MAIN_ENTRANCE',
    'STAFF_ENTRANCE',
    'FLOOR_G_POINT',
    'FLOOR_1_POINT',
    'FLOOR_2_POINT',
    'FLOOR_3_POINT',
  ] as const;
  const parkingCheckpointCodes = [
    'GROUND_PARKING_GATE',
    'BASEMENT_P1_ENTRANCE',
    'BASEMENT_P2_ENTRANCE',
    'WEST_PARKING_GATE',
  ] as const;

  async function upsertPatrolRoute(
    name: string,
    description: string,
    estimatedDurationMinutes: number,
    codes: readonly string[],
  ) {
    const existing = await prisma.patrolRoute.findFirst({ where: { name } });
    const checkpointCreates = codes
      .map((code, index) => {
        const checkpointId = checkpointByCode.get(code);
        if (!checkpointId) return null;
        return {
          checkpointId,
          orderIndex: index,
          expectedMinutesFromStart: (index + 1) * 10,
          isRequired: true,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (existing) {
      await prisma.patrolRouteCheckpoint.deleteMany({ where: { routeId: existing.id } });
      await prisma.patrolRoute.update({
        where: { id: existing.id },
        data: {
          description,
          estimatedDurationMinutes,
          isActive: true,
          checkpoints: { create: checkpointCreates },
        },
      });
      return existing.id;
    }

    const created = await prisma.patrolRoute.create({
      data: {
        name,
        description,
        estimatedDurationMinutes,
        isActive: true,
        checkpoints: { create: checkpointCreates },
      },
    });
    return created.id;
  }

  await upsertPatrolRoute(
    'جولة المبنى الرئيسية',
    'جولة تغطي المداخل ونقاط أدوار المبنى الرئيسي',
    60,
    buildingCheckpointCodes,
  );
  await upsertPatrolRoute(
    'جولة المواقف',
    'جولة تغطي بوابات ومداخل المواقف',
    45,
    parkingCheckpointCodes,
  );
  console.log('Patrol routes upserted');

  // Sprint 19: default notification rules + reminder/escalation settings (no fake messages/conversations)
  const ruleCreator =
    directorUser ??
    (await prisma.user.findFirst({
      where: { deletedAt: null, role: { code: 'OPERATIONS_MANAGER' } },
      select: { id: true },
    }));

  if (ruleCreator?.id) {
    const createdRules = await notificationRuleService.seedDefaults(ruleCreator.id);
    console.log(`Notification rules seeded/ensured (new: ${createdRules})`);
  } else {
    console.log('Skipped notification rules seed — no creator user found');
  }

  console.log('Seed complete.');
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
