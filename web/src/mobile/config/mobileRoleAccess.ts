import type { SvgIconComponent } from '@mui/icons-material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DirectionsCarFilledOutlinedIcon from '@mui/icons-material/DirectionsCarFilledOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VideocamIcon from '@mui/icons-material/Videocam';
import GroupsIcon from '@mui/icons-material/Groups';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SpeedIcon from '@mui/icons-material/Speed';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BarChartIcon from '@mui/icons-material/BarChart';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import {
  PermissionCodes,
  RoleCodes,
  hasPermission,
  hasRole,
} from '../../auth/rbac';

export type MobileRouteId =
  | 'home'
  | 'violations'
  | 'visitors'
  | 'patrols'
  | 'tasks'
  | 'notifications'
  | 'reports'
  | 'profile'
  | 'incidents'
  | 'shift'
  | 'personnel'
  | 'handover'
  | 'cctv-ops'
  | 'referrals'
  | 'operations'
  | 'director'
  | 'statistics'
  | 'response-time'
  | 'change-password';

export interface MobileNavItem {
  id: MobileRouteId;
  to: string;
  end?: boolean;
  label: string;
  Icon: SvgIconComponent;
}

export interface MobileHomeAction {
  id: string;
  label: string;
  to: string;
  Icon: SvgIconComponent;
  permissions?: string[];
  roles?: string[];
}

export interface MobileRouteRule {
  path: string;
  routeId: MobileRouteId;
  permissions?: string[];
  roles?: string[];
  /** If true, any authenticated mobile user may open the route. */
  allowAuthenticated?: boolean;
}

export interface MobileAccessContext {
  roleCode: string;
  permissions: string[];
}

const P = PermissionCodes;
const R = RoleCodes;

export const MOBILE_ROUTE_PATHS: Record<MobileRouteId, string> = {
  home: '/mobile',
  violations: '/mobile/violations',
  visitors: '/mobile/visitors',
  patrols: '/mobile/patrols',
  tasks: '/mobile/tasks',
  notifications: '/mobile/notifications',
  reports: '/mobile/reports',
  profile: '/mobile/profile',
  incidents: '/mobile/incidents',
  shift: '/mobile/shift',
  personnel: '/mobile/personnel',
  handover: '/mobile/handover',
  'cctv-ops': '/mobile/cctv-ops',
  referrals: '/mobile/referrals',
  operations: '/mobile/operations',
  director: '/mobile/director',
  statistics: '/mobile/statistics',
  'response-time': '/mobile/response-time',
  'change-password': '/mobile/change-password',
};

export const MOBILE_ROUTE_RULES: MobileRouteRule[] = [
  { path: '/mobile', routeId: 'home', allowAuthenticated: true },
  { path: '/mobile/profile', routeId: 'profile', allowAuthenticated: true },
  { path: '/mobile/change-password', routeId: 'change-password', allowAuthenticated: true },
  {
    path: '/mobile/violations',
    routeId: 'violations',
    permissions: [P.VIOLATIONS_READ, P.VIOLATIONS_CREATE],
    roles: [R.SECURITY_GUARD, R.SECURITY_SUPERVISOR, R.CCTV_OPERATOR, R.SECURITY_DIRECTOR],
  },
  {
    path: '/mobile/violations/new',
    routeId: 'violations',
    permissions: [P.VIOLATIONS_CREATE, P.VIOLATIONS_UPDATE],
    roles: [R.SECURITY_GUARD, R.SECURITY_SUPERVISOR],
  },
  {
    path: '/mobile/visitors',
    routeId: 'visitors',
    permissions: [P.VISITORS_READ],
    roles: [R.SECURITY_GUARD, R.SECURITY_SUPERVISOR],
  },
  {
    path: '/mobile/patrols',
    routeId: 'patrols',
    permissions: [P.PATROL_SESSIONS_VIEW],
    roles: [R.SECURITY_GUARD, R.SECURITY_SUPERVISOR],
  },
  {
    path: '/mobile/tasks',
    routeId: 'tasks',
    permissions: [P.TASKS_READ],
  },
  {
    path: '/mobile/notifications',
    routeId: 'notifications',
    permissions: [P.NOTIFICATIONS_READ],
  },
  {
    path: '/mobile/reports',
    routeId: 'reports',
    permissions: [P.REPORTS_READ, P.REPORTS_DASHBOARD_VIEW, P.REPORTS_VIEW, P.REPORTS_LIST],
    roles: [R.OPERATIONS_MANAGER, R.PROJECT_MANAGER, R.SECURITY_DIRECTOR],
  },
  {
    path: '/mobile/incidents',
    routeId: 'incidents',
    permissions: [P.INCIDENTS_READ, P.INCIDENTS_VIEW_ALL, P.INCIDENTS_VIEW_ASSIGNED],
    roles: [
      R.SECURITY_GUARD,
      R.SECURITY_SUPERVISOR,
      R.CCTV_OPERATOR,
      R.OPERATIONS_MANAGER,
      R.SECURITY_DIRECTOR,
    ],
  },
  {
    path: '/mobile/shift',
    routeId: 'shift',
    permissions: [P.SHIFTS_READ],
    roles: [R.SECURITY_SUPERVISOR, R.OPERATIONS_MANAGER],
  },
  {
    path: '/mobile/personnel',
    routeId: 'personnel',
    permissions: [P.PERSONNEL_LOCATIONS_VIEW],
    roles: [R.SECURITY_SUPERVISOR, R.OPERATIONS_MANAGER, R.SECURITY_DIRECTOR],
  },
  {
    path: '/mobile/handover',
    routeId: 'handover',
    permissions: [P.SHIFTS_HANDOVER, P.SHIFTS_READ],
    roles: [R.SECURITY_SUPERVISOR],
  },
  {
    path: '/mobile/cctv-ops',
    routeId: 'cctv-ops',
    permissions: [P.CCTV_OPS_DASHBOARD_VIEW, P.CCTV_DASHBOARD_READ],
    roles: [R.CCTV_OPERATOR],
  },
  {
    path: '/mobile/referrals',
    routeId: 'referrals',
    permissions: [P.SECURITY_REFERRALS_VIEW],
    roles: [R.CCTV_OPERATOR, R.SECURITY_GUARD, R.SECURITY_SUPERVISOR],
  },
  {
    path: '/mobile/operations',
    routeId: 'operations',
    permissions: [P.OPERATIONS_ROOM_VIEW, P.OPERATIONS_ROOM_MANAGE],
    roles: [R.OPERATIONS_MANAGER],
  },
  {
    path: '/mobile/director',
    routeId: 'director',
    permissions: [P.DIRECTOR_DASHBOARD],
    roles: [R.SECURITY_DIRECTOR],
  },
  {
    path: '/mobile/statistics',
    routeId: 'statistics',
    permissions: [P.REPORTS_KPI_VIEW, P.KPI_VIEW, P.DIRECTOR_DASHBOARD],
    roles: [R.SECURITY_DIRECTOR, R.PROJECT_MANAGER, R.OPERATIONS_MANAGER],
  },
  {
    path: '/mobile/response-time',
    routeId: 'response-time',
    permissions: [P.KPI_RESPONSE_TIMES, P.OPERATIONS_ROOM_VIEW, P.DASHBOARD_READ],
    roles: [R.OPERATIONS_MANAGER],
  },
];

export const MOBILE_HOME_ACTIONS: Record<string, MobileHomeAction[]> = {
  [R.SECURITY_GUARD]: [
    { id: 'vehicle-violation', label: 'إضافة مخالفة', to: '/mobile/violations', Icon: GavelOutlinedIcon, permissions: [P.VIOLATIONS_READ] },
    { id: 'register-visitor', label: 'إضافة زائر', to: '/mobile/visitors', Icon: PersonAddAltOutlinedIcon, permissions: [P.VISITORS_READ] },
    { id: 'new-incident', label: 'إضافة بلاغ', to: '/mobile/incidents', Icon: ReportProblemIcon, permissions: [P.INCIDENTS_CREATE, P.INCIDENTS_READ] },
    { id: 'register-vehicle', label: 'تسجيل مركبة', to: '/mobile/violations/new', Icon: DirectionsCarFilledOutlinedIcon, permissions: [P.VIOLATIONS_CREATE, P.VIOLATIONS_UPDATE] },
    { id: 'tasks', label: 'عرض المهام', to: '/mobile/tasks', Icon: TaskAltOutlinedIcon, permissions: [P.TASKS_READ] },
    { id: 'scan-qr', label: 'مسح QR', to: '/mobile/patrols', Icon: QrCodeScannerIcon, permissions: [P.PATROL_SESSIONS_VIEW, P.PATROL_SESSIONS_START] },
  ],
  [R.SECURITY_SUPERVISOR]: [
    { id: 'shift-summary', label: 'ملخص الوردية', to: '/mobile/shift', Icon: AssignmentIcon, permissions: [P.SHIFTS_READ] },
    { id: 'open-incidents', label: 'البلاغات المفتوحة', to: '/mobile/incidents', Icon: ReportProblemIcon, permissions: [P.INCIDENTS_READ] },
    { id: 'violations', label: 'مخالفات المركبات', to: '/mobile/violations', Icon: DirectionsCarFilledOutlinedIcon, permissions: [P.VIOLATIONS_READ] },
    { id: 'patrols', label: 'الجولات', to: '/mobile/patrols', Icon: DirectionsWalkIcon, permissions: [P.PATROL_SESSIONS_VIEW] },
    { id: 'personnel', label: 'متابعة رجال الأمن', to: '/mobile/personnel', Icon: FollowTheSignsIcon, permissions: [P.PERSONNEL_LOCATIONS_VIEW] },
    { id: 'handover', label: 'تسليم واستلام الوردية', to: '/mobile/handover', Icon: SwapHorizIcon, permissions: [P.SHIFTS_HANDOVER, P.SHIFTS_READ] },
    { id: 'tasks', label: 'المهام', to: '/mobile/tasks', Icon: TaskAltOutlinedIcon, permissions: [P.TASKS_READ] },
    { id: 'notifications', label: 'الإشعارات', to: '/mobile/notifications', Icon: NotificationsNoneOutlinedIcon, permissions: [P.NOTIFICATIONS_READ] },
  ],
  [R.CCTV_OPERATOR]: [
    { id: 'cctv-ops', label: 'مركز العمليات', to: '/mobile/cctv-ops', Icon: VideocamIcon, permissions: [P.CCTV_OPS_DASHBOARD_VIEW, P.CCTV_DASHBOARD_READ] },
    { id: 'referrals-inbox', label: 'البلاغات المحالة', to: '/mobile/referrals', Icon: AssignmentIcon, permissions: [P.SECURITY_REFERRALS_VIEW] },
    { id: 'camera-notes', label: 'ملاحظات الكاميرات', to: '/mobile/cctv-ops', Icon: MonitorHeartIcon, permissions: [P.CCTV_OPS_DASHBOARD_VIEW, P.CAMERA_REQUESTS_READ] },
    { id: 'security-referrals', label: 'الإحالات الأمنية', to: '/mobile/referrals', Icon: FollowTheSignsIcon, permissions: [P.SECURITY_REFERRALS_VIEW] },
    { id: 'tasks', label: 'المهام', to: '/mobile/tasks', Icon: TaskAltOutlinedIcon, permissions: [P.TASKS_READ] },
    { id: 'notifications', label: 'الإشعارات', to: '/mobile/notifications', Icon: NotificationsNoneOutlinedIcon, permissions: [P.NOTIFICATIONS_READ] },
  ],
  [R.OPERATIONS_MANAGER]: [
    { id: 'ops-board', label: 'لوحة العمليات', to: '/mobile/operations', Icon: MonitorHeartIcon, permissions: [P.OPERATIONS_ROOM_VIEW] },
    { id: 'escalations', label: 'التصعيدات', to: '/mobile/incidents', Icon: ReportProblemIcon, permissions: [P.INCIDENTS_READ, P.INCIDENTS_VIEW_ALL] },
    { id: 'supervisors', label: 'متابعة المشرفين', to: '/mobile/personnel', Icon: FollowTheSignsIcon, permissions: [P.PERSONNEL_LOCATIONS_VIEW] },
    { id: 'response-time', label: 'زمن الاستجابة', to: '/mobile/response-time', Icon: SpeedIcon, permissions: [P.KPI_RESPONSE_TIMES, P.DASHBOARD_READ] },
    { id: 'tasks', label: 'المهام', to: '/mobile/tasks', Icon: TaskAltOutlinedIcon, permissions: [P.TASKS_READ] },
    { id: 'reports', label: 'التقارير المختصرة', to: '/mobile/reports', Icon: AssessmentOutlinedIcon, permissions: [P.REPORTS_READ, P.REPORTS_DASHBOARD_VIEW] },
  ],
  [R.PROJECT_MANAGER]: [
    { id: 'kpis', label: 'مؤشرات الأداء', to: '/mobile/statistics', Icon: BarChartIcon, permissions: [P.KPI_VIEW, P.REPORTS_KPI_VIEW] },
    { id: 'reports', label: 'التقارير', to: '/mobile/reports', Icon: AssessmentOutlinedIcon, permissions: [P.REPORTS_READ, P.REPORTS_VIEW] },
    { id: 'tasks', label: 'المهام', to: '/mobile/tasks', Icon: TaskAltOutlinedIcon, permissions: [P.TASKS_READ] },
    { id: 'notifications', label: 'الإشعارات', to: '/mobile/notifications', Icon: NotificationsNoneOutlinedIcon, permissions: [P.NOTIFICATIONS_READ] },
  ],
  [R.SECURITY_DIRECTOR]: [
    { id: 'director', label: 'لوحة المدير', to: '/mobile/director', Icon: AdminPanelSettingsIcon, permissions: [P.DIRECTOR_DASHBOARD] },
    { id: 'statistics', label: 'الإحصائيات', to: '/mobile/statistics', Icon: BarChartIcon, permissions: [P.DIRECTOR_DASHBOARD, P.KPI_VIEW] },
    { id: 'critical', label: 'البلاغات الحرجة', to: '/mobile/incidents', Icon: ReportProblemIcon, permissions: [P.INCIDENTS_READ, P.INCIDENTS_VIEW_ALL] },
    { id: 'violations', label: 'المخالفات', to: '/mobile/violations', Icon: DirectionsCarFilledOutlinedIcon, permissions: [P.VIOLATIONS_READ] },
    { id: 'online-users', label: 'المستخدمون المتصلون', to: '/mobile/personnel', Icon: GroupsIcon, permissions: [P.PERSONNEL_LOCATIONS_VIEW, P.USERS_READ] },
    { id: 'reports', label: 'التقارير', to: '/mobile/reports', Icon: AssessmentOutlinedIcon, permissions: [P.REPORTS_READ, P.REPORTS_VIEW] },
    { id: 'notifications', label: 'الإشعارات', to: '/mobile/notifications', Icon: NotificationsNoneOutlinedIcon, permissions: [P.NOTIFICATIONS_READ] },
  ],
};

const DEFAULT_NAV: MobileNavItem[] = [
  { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
  { id: 'tasks', to: '/mobile/tasks', label: 'المهام', Icon: TaskAltOutlinedIcon },
  { id: 'notifications', to: '/mobile/notifications', label: 'التنبيهات', Icon: NotificationsNoneOutlinedIcon },
  { id: 'profile', to: '/mobile/profile', end: false, label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
];

export const MOBILE_BOTTOM_NAV: Record<string, MobileNavItem[]> = {
  [R.SECURITY_GUARD]: [
    { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
    { id: 'violations', to: '/mobile/violations', label: 'المخالفات', Icon: DirectionsCarFilledOutlinedIcon },
    { id: 'tasks', to: '/mobile/tasks', label: 'المهام', Icon: TaskAltOutlinedIcon },
    { id: 'notifications', to: '/mobile/notifications', label: 'التنبيهات', Icon: NotificationsNoneOutlinedIcon },
    { id: 'profile', to: '/mobile/profile', label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
  ],
  [R.SECURITY_SUPERVISOR]: [
    { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
    { id: 'violations', to: '/mobile/violations', label: 'المخالفات', Icon: DirectionsCarFilledOutlinedIcon },
    { id: 'patrols', to: '/mobile/patrols', label: 'الجولات', Icon: DirectionsWalkIcon },
    { id: 'tasks', to: '/mobile/tasks', label: 'المهام', Icon: TaskAltOutlinedIcon },
    { id: 'profile', to: '/mobile/profile', label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
  ],
  [R.CCTV_OPERATOR]: [
    { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
    { id: 'cctv-ops', to: '/mobile/cctv-ops', label: 'العمليات', Icon: VideocamIcon },
    { id: 'referrals', to: '/mobile/referrals', label: 'الإحالات', Icon: AssignmentIcon },
    { id: 'tasks', to: '/mobile/tasks', label: 'المهام', Icon: TaskAltOutlinedIcon },
    { id: 'profile', to: '/mobile/profile', label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
  ],
  [R.OPERATIONS_MANAGER]: [
    { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
    { id: 'operations', to: '/mobile/operations', label: 'العمليات', Icon: MonitorHeartIcon },
    { id: 'tasks', to: '/mobile/tasks', label: 'المهام', Icon: TaskAltOutlinedIcon },
    { id: 'reports', to: '/mobile/reports', label: 'التقارير', Icon: AssessmentOutlinedIcon },
    { id: 'profile', to: '/mobile/profile', label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
  ],
  [R.PROJECT_MANAGER]: [
    { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
    { id: 'statistics', to: '/mobile/statistics', label: 'المؤشرات', Icon: BarChartIcon },
    { id: 'reports', to: '/mobile/reports', label: 'التقارير', Icon: AssessmentOutlinedIcon },
    { id: 'notifications', to: '/mobile/notifications', label: 'التنبيهات', Icon: NotificationsNoneOutlinedIcon },
    { id: 'profile', to: '/mobile/profile', label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
  ],
  [R.SECURITY_DIRECTOR]: [
    { id: 'home', to: '/mobile', end: true, label: 'الرئيسية', Icon: HomeOutlinedIcon },
    { id: 'director', to: '/mobile/director', label: 'المدير', Icon: AdminPanelSettingsIcon },
    { id: 'violations', to: '/mobile/violations', label: 'المخالفات', Icon: DirectionsCarFilledOutlinedIcon },
    { id: 'reports', to: '/mobile/reports', label: 'التقارير', Icon: AssessmentOutlinedIcon },
    { id: 'profile', to: '/mobile/profile', label: 'حسابي', Icon: PersonOutlineOutlinedIcon },
  ],
};

function matchesAccess(
  ctx: MobileAccessContext,
  permissions?: string[],
  roles?: string[],
  allowAuthenticated?: boolean,
): boolean {
  if (allowAuthenticated) return true;
  const permissionOk = hasPermission(ctx.permissions, permissions);
  const roleOk = hasRole(ctx.roleCode, roles);
  if (permissions?.length && roles?.length) return permissionOk || roleOk;
  if (permissions?.length) return permissionOk;
  if (roles?.length) return roleOk;
  return true;
}

export function canAccessMobileAction(
  action: MobileHomeAction,
  ctx: MobileAccessContext,
): boolean {
  return matchesAccess(ctx, action.permissions, action.roles);
}

export function getMobileHomeActions(ctx: MobileAccessContext): MobileHomeAction[] {
  const actions = MOBILE_HOME_ACTIONS[ctx.roleCode] ?? MOBILE_HOME_ACTIONS[R.SECURITY_GUARD] ?? [];
  return actions.filter((action) => canAccessMobileAction(action, ctx));
}

export function getMobileBottomNav(ctx: MobileAccessContext): MobileNavItem[] {
  const items = MOBILE_BOTTOM_NAV[ctx.roleCode] ?? DEFAULT_NAV;
  return items.filter((item) => canAccessMobileRoute(item.to, ctx));
}

export function findMobileRouteRule(pathname: string): MobileRouteRule | undefined {
  const normalized = pathname.replace(/\/$/, '') || '/mobile';
  const exact = MOBILE_ROUTE_RULES.find((rule) => rule.path === normalized);
  if (exact) return exact;
  // Prefer the longest matching prefix so nested routes (e.g. /violations/new) keep their own rules.
  return [...MOBILE_ROUTE_RULES]
    .filter((rule) => rule.path !== '/mobile' && normalized.startsWith(`${rule.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
}

export function canAccessMobileRoute(pathname: string, ctx: MobileAccessContext): boolean {
  const rule = findMobileRouteRule(pathname);
  if (!rule) return true;
  return matchesAccess(ctx, rule.permissions, rule.roles, rule.allowAuthenticated);
}

export const MOBILE_ACCESS_DENIED_MESSAGE = 'ليس لديك صلاحية للوصول إلى هذه الصفحة';
