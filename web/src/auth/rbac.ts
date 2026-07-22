import DashboardIcon from '@mui/icons-material/Dashboard';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import GroupsIcon from '@mui/icons-material/Groups';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VideocamIcon from '@mui/icons-material/Videocam';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import MapIcon from '@mui/icons-material/Map';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import RouteIcon from '@mui/icons-material/Route';
import PlaceIcon from '@mui/icons-material/Place';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LayersIcon from '@mui/icons-material/Layers';
import InfoOutlineIcon from '@mui/icons-material/InfoOutlined';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FollowTheSignsIcon from '@mui/icons-material/FollowTheSigns';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import ForumIcon from '@mui/icons-material/Forum';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RuleIcon from '@mui/icons-material/Rule';
import type { SvgIconComponent } from '@mui/icons-material';
export const RoleCodes = {
  SECURITY_GUARD: 'SECURITY_GUARD',
  SECURITY_SUPERVISOR: 'SECURITY_SUPERVISOR',
  CCTV_OPERATOR: 'CCTV_OPERATOR',
  OPERATIONS_MANAGER: 'OPERATIONS_MANAGER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SECURITY_DIRECTOR: 'SECURITY_DIRECTOR',
} as const;
export const PermissionCodes = {
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  PERMISSIONS_READ: 'permissions:read',
  VIOLATIONS_READ: 'violations:read',
  VIOLATIONS_CREATE: 'violations:create',
  VIOLATIONS_UPDATE: 'violations:update',
  VIOLATIONS_ASSIGN: 'violations:assign',
  VIOLATIONS_CLOSE: 'violations:close',
  VISITORS_READ: 'visitors:read',
  INCIDENTS_READ: 'incidents:read',
  INCIDENTS_CREATE: 'incidents:create',
  INCIDENTS_UPDATE: 'incidents:update',
  INCIDENTS_HANDLE: 'incidents:handle',
  INCIDENTS_CLOSE: 'incidents:close',
  INCIDENTS_COMMENT: 'incidents:comment',
  INCIDENTS_VIEW_ALL: 'incidents:view_all',
  INCIDENTS_VIEW_ASSIGNED: 'incidents:view_assigned',
  INCIDENTS_ACKNOWLEDGE: 'incidents:acknowledge',
  INCIDENTS_ASSESS: 'incidents:assess',
  INCIDENTS_ASSIGN: 'incidents:assign',
  INCIDENTS_REASSIGN: 'incidents:reassign',
  INCIDENTS_RESPOND: 'incidents:respond',
  INCIDENTS_ARRIVE: 'incidents:arrive',
  INCIDENTS_CONTAIN: 'incidents:contain',
  INCIDENTS_RESOLVE: 'incidents:resolve',
  INCIDENTS_REOPEN: 'incidents:reopen',
  INCIDENTS_CANCEL: 'incidents:cancel',
  INCIDENTS_FALSE_ALARM: 'incidents:false_alarm',
  INCIDENTS_ESCALATE: 'incidents:escalate',
  INCIDENTS_REQUEST_SUPPORT: 'incidents:request_support',
  INCIDENTS_NOTES: 'incidents:notes',
  INCIDENTS_NOTES_CONFIDENTIAL: 'incidents:notes_confidential',
  INCIDENTS_CONTACTS: 'incidents:contacts',
  INCIDENTS_TASKS: 'incidents:tasks',
  INCIDENTS_FOLLOW_UPS: 'incidents:follow_ups',
  INCIDENTS_ATTACHMENTS: 'incidents:attachments',
  INCIDENTS_CONVERT_REFERRAL: 'incidents:convert_referral',
  INCIDENTS_CONVERT_ALERT: 'incidents:convert_alert',
  INCIDENTS_CONVERT_VIOLATION: 'incidents:convert_violation',
  OPERATIONS_ROOM_VIEW: 'operations_room:view',
  OPERATIONS_ROOM_MANAGE: 'operations_room:manage',
  EMERGENCY_PROCEDURES_VIEW: 'emergency_procedures:view',
  EMERGENCY_PROCEDURES_MANAGE: 'emergency_procedures:manage',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_UPDATE: 'notifications:update',
  NOTIFICATIONS_ACKNOWLEDGE: 'notifications:acknowledge',
  NOTIFICATIONS_PREFERENCES_READ: 'notifications:preferences_read',
  NOTIFICATIONS_PREFERENCES_UPDATE: 'notifications:preferences_update',
  NOTIFICATIONS_RULES_READ: 'notifications:rules_read',
  NOTIFICATIONS_RULES_MANAGE: 'notifications:rules_manage',
  NOTIFICATIONS_STATISTICS: 'notifications:statistics',
  COMMUNICATIONS_READ: 'communications:read',
  COMMUNICATIONS_CREATE: 'communications:create',
  COMMUNICATIONS_SEND: 'communications:send',
  COMMUNICATIONS_UPDATE: 'communications:update',
  COMMUNICATIONS_DELETE: 'communications:delete',
  COMMUNICATIONS_ATTACHMENTS: 'communications:attachments',
  COMMUNICATIONS_MANAGE: 'communications:manage',
  TASKS_READ: 'tasks:read',
  TASKS_CREATE: 'tasks:create',
  TASKS_UPDATE: 'tasks:update',
  TASKS_ASSIGN: 'tasks:assign',
  TASKS_ACCEPT: 'tasks:accept',
  TASKS_START: 'tasks:start',
  TASKS_WAIT: 'tasks:wait',
  TASKS_COMPLETE: 'tasks:complete',
  TASKS_REJECT: 'tasks:reject',
  TASKS_CANCEL: 'tasks:cancel',
  TASKS_ESCALATE: 'tasks:escalate',
  TASKS_EVIDENCE: 'tasks:evidence',
  TASKS_TIMELINE: 'tasks:timeline',
  DASHBOARD_READ: 'dashboard:read',
  VIOLATIONS_STATS: 'violations:stats',
  VISITORS_STATS: 'visitors:stats',
  CAMERA_REQUESTS_READ: 'camera_requests:read',
  CAMERA_REQUESTS_CREATE: 'camera_requests:create',
  CAMERA_REQUESTS_HANDLE: 'camera_requests:handle',
  VEHICLE_PERMITS_READ: 'vehicle_permits:read',
  CCTV_DASHBOARD_READ: 'cctv_dashboard:read',
  COMPLAINTS_READ: 'complaints:read',
  COMPLAINTS_CREATE: 'complaints:create',
  COMPLAINTS_UPDATE: 'complaints:update',
  COMPLAINTS_APPROVE: 'complaints:approve',
  COMPLAINTS_REJECT: 'complaints:reject',
  DIRECTOR_DASHBOARD: 'director:dashboard',
  REPORTS_READ: 'reports:read',
  REPORTS_DASHBOARD_VIEW: 'reports:dashboard_view',
  REPORTS_LIST: 'reports:list',
  REPORTS_VIEW: 'reports:view',
  REPORTS_GENERATE: 'reports:generate',
  REPORTS_GENERATE_DAILY: 'reports:generate_daily',
  REPORTS_GENERATE_SHIFT: 'reports:generate_shift',
  REPORTS_GENERATE_HANDOVER: 'reports:generate_handover',
  REPORTS_GENERATE_CUSTOM: 'reports:generate_custom',
  REPORTS_EXPORT_PDF: 'reports:export_pdf',
  REPORTS_EXPORT_CSV: 'reports:export_csv',
  REPORTS_SUBMIT: 'reports:submit',
  REPORTS_APPROVE: 'reports:approve',
  REPORTS_REJECT: 'reports:reject',
  REPORTS_RETURN: 'reports:return',
  REPORTS_ARCHIVE: 'reports:archive',
  REPORTS_CREATE_VERSION: 'reports:create_version',
  REPORTS_SCHEDULES_VIEW: 'reports:schedules_view',
  REPORTS_SCHEDULES_MANAGE: 'reports:schedules_manage',
  REPORTS_ACCESS_LOG_VIEW: 'reports:access_log_view',
  REPORTS_KPI_VIEW: 'reports:kpi_view',
  KPI_VIEW: 'kpi:view',
  KPI_INCIDENTS: 'kpi:incidents',
  KPI_RESPONSE_TIMES: 'kpi:response_times',
  KPI_PATROLS: 'kpi:patrols',
  KPI_CCTV_REFERRALS: 'kpi:cctv_referrals',
  KPI_PERMITS: 'kpi:permits',
  KPI_VIOLATIONS: 'kpi:violations',
  KPI_VISITORS: 'kpi:visitors',
  KPI_PERSONNEL: 'kpi:personnel',
  KPI_GROUPS: 'kpi:groups',
  KPI_SHIFTS: 'kpi:shifts',
  AUDIT_READ: 'audit:read',
  AUDIT_LOGS_VIEW: 'audit_logs:view',
  AUDIT_LOGS_VIEW_SENSITIVE: 'audit_logs:view_sensitive',
  AUDIT_LOGS_EXPORT: 'audit_logs:export',
  AUDIT_LOGS_STATISTICS: 'audit_logs:statistics',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  SHIFTS_READ: 'shifts:read',
  SHIFTS_UPDATE: 'shifts:update',
  SHIFTS_MANAGE: 'shifts:manage',
  SHIFTS_HANDOVER: 'shifts:handover',
  SHIFTS_STATS: 'shifts:stats',
  FIELD_MAP_VIEW: 'field_map:view',
  FIELD_MAP_MANAGE: 'field_map:manage',
  SECURITY_ZONES_VIEW: 'security_zones:view',
  SECURITY_ZONES_CREATE: 'security_zones:create',
  SECURITY_ZONES_UPDATE: 'security_zones:update',
  SECURITY_ZONES_DELETE: 'security_zones:delete',
  CHECKPOINTS_VIEW: 'checkpoints:view',
  CHECKPOINTS_CREATE: 'checkpoints:create',
  CHECKPOINTS_UPDATE: 'checkpoints:update',
  CHECKPOINTS_DELETE: 'checkpoints:delete',
  PATROL_ROUTES_VIEW: 'patrol_routes:view',
  PATROL_ROUTES_MANAGE: 'patrol_routes:manage',
  PATROL_SESSIONS_VIEW: 'patrol_sessions:view',
  PATROL_SESSIONS_CREATE: 'patrol_sessions:create',
  PATROL_SESSIONS_ASSIGN: 'patrol_sessions:assign',
  PATROL_SESSIONS_START: 'patrol_sessions:start',
  PATROL_SESSIONS_COMPLETE: 'patrol_sessions:complete',
  PATROL_SESSIONS_CANCEL: 'patrol_sessions:cancel',
  PERSONNEL_LOCATIONS_VIEW: 'personnel_locations:view',
  PERSONNEL_LOCATIONS_UPDATE_SELF: 'personnel_locations:update_self',
  PERSONNEL_LOCATIONS_UPDATE_ANY: 'personnel_locations:update_any',
  FIELD_ALERTS_VIEW: 'field_alerts:view',
  FIELD_ALERTS_CREATE: 'field_alerts:create',
  FIELD_ALERTS_ACKNOWLEDGE: 'field_alerts:acknowledge',
  FIELD_ALERTS_RESOLVE: 'field_alerts:resolve',
  CCTV_OPS_DASHBOARD_VIEW: 'cctv_operations:dashboard_view',
  PERMITS_VIEW: 'permits:view',
  PERMITS_CREATE: 'permits:create',
  PERMITS_UPDATE: 'permits:update',
  PERMITS_ACTIVATE: 'permits:activate',
  PERMITS_CANCEL: 'permits:cancel',
  PERMITS_REJECT: 'permits:reject',
  PERMITS_SHARE: 'permits:share',
  PERMITS_ACKNOWLEDGE: 'permits:acknowledge',
  PERMITS_VIEW_SENSITIVE: 'permits:view_sensitive_data',
  PERMITS_DOWNLOAD_ATTACHMENT: 'permits:download_attachment',
  SECURITY_REFERRALS_VIEW: 'security_referrals:view',
  SECURITY_REFERRALS_CREATE: 'security_referrals:create',
  SECURITY_REFERRALS_UPDATE: 'security_referrals:update',
  SECURITY_REFERRALS_SEND: 'security_referrals:send',
  SECURITY_REFERRALS_ASSIGN: 'security_referrals:assign',
  SECURITY_REFERRALS_RECEIVE: 'security_referrals:receive',
  SECURITY_REFERRALS_START: 'security_referrals:start',
  SECURITY_REFERRALS_ARRIVE: 'security_referrals:arrive',
  SECURITY_REFERRALS_RESOLVE: 'security_referrals:resolve',
  SECURITY_REFERRALS_REJECT: 'security_referrals:reject',
  SECURITY_REFERRALS_CANCEL: 'security_referrals:cancel',
  SECURITY_REFERRALS_ESCALATE: 'security_referrals:escalate',
  SECURITY_REFERRALS_CLOSE: 'security_referrals:close',
  SECURITY_REFERRALS_ADD_NOTE: 'security_referrals:add_note',
  SECURITY_REFERRALS_UPLOAD_ATTACHMENT: 'security_referrals:upload_attachment',
  SECURITY_REFERRALS_DOWNLOAD_ATTACHMENT: 'security_referrals:download_attachment',
} as const;
/** Arabic role labels — CCTV uses feminine wording. */
export const ROLE_LABELS: Record<string, string> = {
  [RoleCodes.SECURITY_GUARD]: 'حارس أمن',
  [RoleCodes.SECURITY_SUPERVISOR]: 'مشرف أمن',
  [RoleCodes.CCTV_OPERATOR]: 'مشغلة كاميرات المراقبة CCTV',
  [RoleCodes.OPERATIONS_MANAGER]: 'مدير العمليات',
  [RoleCodes.PROJECT_MANAGER]: 'مدير المشروع',
  [RoleCodes.SECURITY_DIRECTOR]: 'المدير الأمني',
};
export type NavItemId =
  | 'home'
  | 'violations'
  | 'visitors'
  | 'incidents'
  | 'cctv'
  | 'director'
  | 'complaints'
  | 'users'
  | 'permissions'
  | 'notifications'
  | 'notification-preferences'
  | 'notification-rules'
  | 'communications'
  | 'tasks'
  | 'tasks-my'
  | 'tasks-overdue'
  | 'tasks-statistics'
  | 'statistics'
  | 'settings'
  | 'shifts'
  | 'shift-handover'
  | 'shift-stats'
  | 'field-operations'
  | 'field-map'
  | 'field-patrols'
  | 'field-patrol-routes'
  | 'field-checkpoints'
  | 'field-alerts'
  | 'field-zones'
  | 'field-statistics'
  | 'cctv-operations'
  | 'cctv-ops-permits'
  | 'cctv-ops-referrals'
  | 'cctv-ops-follow-up'
  | 'cctv-ops-statistics'
  | 'operations-room'
  | 'incidents-my'
  | 'incidents-critical'
  | 'incidents-follow-up'
  | 'incidents-statistics'
  | 'emergency-procedures'
  | 'reports'
  | 'reports-performance'
  | 'reports-saved'
  | 'reports-schedules'
  | 'audit-logs'
  | 'about';
export interface NavItem {
  id: NavItemId;
  label: string;
  path: string;
  icon: SvgIconComponent;
  permissions?: string[];
  roles?: string[];
}
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'الرئيسية',
    path: '/',
    icon: DashboardIcon,
    permissions: [PermissionCodes.DASHBOARD_READ],
  },
  {
    id: 'violations',
    label: 'مخالفات المركبات',
    path: '/violations',
    icon: DirectionsCarFilledIcon,
    permissions: [PermissionCodes.VIOLATIONS_READ],
  },
  {
    id: 'visitors',
    label: 'الزوار',
    path: '/visitors',
    icon: GroupsIcon,
    permissions: [PermissionCodes.VISITORS_READ],
    roles: [RoleCodes.SECURITY_SUPERVISOR, RoleCodes.OPERATIONS_MANAGER, RoleCodes.SECURITY_DIRECTOR],
  },
  {
    id: 'operations-room',
    label: 'غرفة العمليات الأمنية',
    path: '/operations-room',
    icon: MonitorHeartIcon,
    permissions: [
      PermissionCodes.OPERATIONS_ROOM_VIEW,
      PermissionCodes.OPERATIONS_ROOM_MANAGE,
      PermissionCodes.INCIDENTS_VIEW_ALL,
    ],
  },
  {
    id: 'incidents',
    label: 'البلاغات والحوادث',
    path: '/incidents',
    icon: ReportProblemIcon,
    permissions: [
      PermissionCodes.INCIDENTS_READ,
      PermissionCodes.INCIDENTS_VIEW_ALL,
      PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
    ],
  },
  {
    id: 'incidents-my',
    label: 'الحوادث المسندة إليّ',
    path: '/incidents/my-incidents',
    icon: AssignmentIcon,
    permissions: [
      PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
      PermissionCodes.INCIDENTS_READ,
    ],
  },
  {
    id: 'incidents-critical',
    label: 'الحالات الحرجة',
    path: '/incidents/critical',
    icon: ReportProblemIcon,
    permissions: [
      PermissionCodes.INCIDENTS_READ,
      PermissionCodes.INCIDENTS_VIEW_ALL,
      PermissionCodes.OPERATIONS_ROOM_VIEW,
    ],
  },
  {
    id: 'incidents-follow-up',
    label: 'المتابعة اللاحقة',
    path: '/incidents/follow-up',
    icon: FollowTheSignsIcon,
    permissions: [
      PermissionCodes.INCIDENTS_FOLLOW_UPS,
      PermissionCodes.INCIDENTS_VIEW_ALL,
      PermissionCodes.OPERATIONS_ROOM_VIEW,
    ],
  },
  {
    id: 'incidents-statistics',
    label: 'إحصائيات الحوادث',
    path: '/incidents/statistics',
    icon: BarChartIcon,
    permissions: [
      PermissionCodes.OPERATIONS_ROOM_VIEW,
      PermissionCodes.INCIDENTS_VIEW_ALL,
    ],
  },
  {
    id: 'emergency-procedures',
    label: 'إجراءات الطوارئ',
    path: '/emergency-procedures',
    icon: SecurityIcon,
    permissions: [
      PermissionCodes.EMERGENCY_PROCEDURES_VIEW,
      PermissionCodes.EMERGENCY_PROCEDURES_MANAGE,
    ],
  },
  {
    id: 'cctv',
    label: 'غرفة التحكم CCTV',
    path: '/cctv',
    icon: VideocamIcon,
    roles: [
      RoleCodes.CCTV_OPERATOR,
      RoleCodes.OPERATIONS_MANAGER,
      RoleCodes.PROJECT_MANAGER,
      RoleCodes.SECURITY_DIRECTOR,
    ],
  },
  {
    id: 'director',
    label: 'لوحة مدير الأمن',
    path: '/director',
    icon: SecurityIcon,
    roles: [RoleCodes.SECURITY_DIRECTOR],
  },
  {
    id: 'complaints',
    label: 'الشكاوى',
    path: '/complaints',
    icon: SupportAgentIcon,
    permissions: [PermissionCodes.COMPLAINTS_READ],
    roles: [RoleCodes.SECURITY_DIRECTOR],
  },
  {
    id: 'users',
    label: 'المستخدمون',
    path: '/users',
    icon: PeopleIcon,
    permissions: [PermissionCodes.USERS_READ],
  },
  {
    id: 'permissions',
    label: 'الصلاحيات',
    path: '/permissions',
    icon: AdminPanelSettingsIcon,
    permissions: [PermissionCodes.ROLES_READ, PermissionCodes.PERMISSIONS_READ],
    roles: [RoleCodes.SECURITY_DIRECTOR],
  },
  {
    id: 'notifications',
    label: 'مركز الإشعارات',
    path: '/notifications',
    icon: NotificationsIcon,
    permissions: [PermissionCodes.NOTIFICATIONS_READ],
  },
  {
    id: 'notification-preferences',
    label: 'تفضيلات الإشعارات',
    path: '/notifications/preferences',
    icon: SettingsIcon,
    permissions: [
      PermissionCodes.NOTIFICATIONS_PREFERENCES_READ,
      PermissionCodes.NOTIFICATIONS_READ,
    ],
  },
  {
    id: 'notification-rules',
    label: 'قواعد الإشعارات',
    path: '/notifications/rules',
    icon: RuleIcon,
    permissions: [PermissionCodes.NOTIFICATIONS_RULES_READ],
  },
  {
    id: 'communications',
    label: 'الاتصالات الداخلية',
    path: '/communications',
    icon: ForumIcon,
    permissions: [PermissionCodes.COMMUNICATIONS_READ],
  },
  {
    id: 'tasks',
    label: 'مركز المهام',
    path: '/tasks',
    icon: TaskAltIcon,
    permissions: [PermissionCodes.TASKS_READ],
  },
  {
    id: 'tasks-my',
    label: 'مهامي',
    path: '/tasks/my',
    icon: AssignmentIcon,
    permissions: [PermissionCodes.TASKS_READ],
  },
  {
    id: 'tasks-overdue',
    label: 'المهام المتأخرة',
    path: '/tasks/overdue',
    icon: NotificationsActiveIcon,
    permissions: [PermissionCodes.TASKS_READ],
  },
  {
    id: 'tasks-statistics',
    label: 'إحصائيات المهام',
    path: '/tasks/statistics',
    icon: BarChartIcon,
    permissions: [PermissionCodes.TASKS_READ],
  },
  {
    id: 'statistics',
    label: 'الإحصائيات',
    path: '/statistics',
    icon: BarChartIcon,
    permissions: [PermissionCodes.VIOLATIONS_STATS, PermissionCodes.VISITORS_STATS],
    roles: [RoleCodes.PROJECT_MANAGER, RoleCodes.OPERATIONS_MANAGER, RoleCodes.SECURITY_DIRECTOR],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    path: '/settings',
    icon: SettingsIcon,
    roles: [
      RoleCodes.OPERATIONS_MANAGER,
      RoleCodes.SECURITY_DIRECTOR,
      RoleCodes.SECURITY_SUPERVISOR,
    ],
  },
  {
    id: 'shifts',
    label: 'إدارة الورديات',
    path: '/shifts',
    icon: ScheduleIcon,
    permissions: [PermissionCodes.SHIFTS_READ],
  },
  {
    id: 'shift-handover',
    label: 'تسليم واستلام الوردية',
    path: '/shifts/handover',
    icon: SwapHorizIcon,
    permissions: [PermissionCodes.SHIFTS_HANDOVER],
    roles: [
      RoleCodes.SECURITY_SUPERVISOR,
      RoleCodes.OPERATIONS_MANAGER,
      RoleCodes.PROJECT_MANAGER,
      RoleCodes.SECURITY_DIRECTOR,
    ],
  },
  {
    id: 'shift-stats',
    label: 'إحصائيات الورديات',
    path: '/shifts/statistics',
    icon: BarChartIcon,
    permissions: [PermissionCodes.SHIFTS_STATS],
  },
  {
    id: 'field-operations',
    label: 'العمليات الميدانية',
    path: '/field-operations',
    icon: MapIcon,
    permissions: [PermissionCodes.FIELD_MAP_VIEW],
  },
  {
    id: 'field-map',
    label: 'الخريطة الأمنية',
    path: '/field-operations/map',
    icon: MapIcon,
    permissions: [PermissionCodes.FIELD_MAP_VIEW],
  },
  {
    id: 'field-patrols',
    label: 'الجولات الأمنية',
    path: '/field-operations/patrols',
    icon: DirectionsWalkIcon,
    permissions: [PermissionCodes.PATROL_SESSIONS_VIEW],
  },
  {
    id: 'field-patrol-routes',
    label: 'مسارات الجولات',
    path: '/field-operations/patrols/routes',
    icon: RouteIcon,
    permissions: [PermissionCodes.PATROL_ROUTES_VIEW],
  },
  {
    id: 'field-checkpoints',
    label: 'النقاط الأمنية',
    path: '/field-operations/checkpoints',
    icon: PlaceIcon,
    permissions: [PermissionCodes.CHECKPOINTS_VIEW],
  },
  {
    id: 'field-alerts',
    label: 'التنبيهات الميدانية',
    path: '/field-operations/alerts',
    icon: NotificationsActiveIcon,
    permissions: [PermissionCodes.FIELD_ALERTS_VIEW, PermissionCodes.FIELD_ALERTS_CREATE],
  },
  {
    id: 'field-zones',
    label: 'المواقع والمناطق',
    path: '/field-operations/zones',
    icon: LayersIcon,
    permissions: [PermissionCodes.SECURITY_ZONES_VIEW],
  },
  {
    id: 'field-statistics',
    label: 'إحصائيات العمليات الميدانية',
    path: '/field-operations/statistics',
    icon: BarChartIcon,
    permissions: [PermissionCodes.FIELD_MAP_VIEW],
  },
  {
    id: 'cctv-operations',
    label: 'مركز عمليات المراقبة',
    path: '/cctv-operations',
    icon: MonitorHeartIcon,
    permissions: [PermissionCodes.CCTV_OPS_DASHBOARD_VIEW],
  },
  {
    id: 'cctv-ops-permits',
    label: 'التصاريح',
    path: '/cctv-operations/permits',
    icon: AssignmentIcon,
    permissions: [PermissionCodes.PERMITS_VIEW],
  },
  {
    id: 'cctv-ops-referrals',
    label: 'الإحالات الأمنية',
    path: '/cctv-operations/referrals',
    icon: SecurityIcon,
    permissions: [PermissionCodes.SECURITY_REFERRALS_VIEW],
  },
  {
    id: 'cctv-ops-follow-up',
    label: 'متابعة الحالات',
    path: '/cctv-operations/follow-up',
    icon: FollowTheSignsIcon,
    permissions: [PermissionCodes.SECURITY_REFERRALS_VIEW],
  },
  {
    id: 'cctv-ops-statistics',
    label: 'إحصائيات عمليات المراقبة',
    path: '/cctv-operations/statistics',
    icon: BarChartIcon,
    permissions: [PermissionCodes.CCTV_OPS_DASHBOARD_VIEW],
  },
  {
    id: 'reports',
    label: 'مركز التقارير',
    path: '/reports',
    icon: AssessmentIcon,
    permissions: [
      PermissionCodes.REPORTS_DASHBOARD_VIEW,
      PermissionCodes.REPORTS_VIEW,
      PermissionCodes.REPORTS_LIST,
      PermissionCodes.REPORTS_READ,
      PermissionCodes.REPORTS_KPI_VIEW,
      PermissionCodes.KPI_VIEW,
    ],
  },
  {
    id: 'reports-performance',
    label: 'مؤشرات الأداء',
    path: '/reports/performance',
    icon: AutoGraphIcon,
    permissions: [PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW],
  },
  {
    id: 'reports-saved',
    label: 'التقارير المحفوظة',
    path: '/reports/saved',
    icon: BookmarkIcon,
    permissions: [PermissionCodes.REPORTS_LIST, PermissionCodes.REPORTS_VIEW],
  },
  {
    id: 'reports-schedules',
    label: 'جدولة التقارير',
    path: '/reports/schedules',
    icon: ScheduleIcon,
    permissions: [
      PermissionCodes.REPORTS_SCHEDULES_VIEW,
      PermissionCodes.REPORTS_SCHEDULES_MANAGE,
    ],
  },
  {
    id: 'audit-logs',
    label: 'سجلات التدقيق',
    path: '/audit-logs',
    icon: HistoryEduIcon,
    permissions: [PermissionCodes.AUDIT_LOGS_VIEW, PermissionCodes.AUDIT_READ],
  },
  {
    id: 'about',
    label: 'حول النظام',
    path: '/about',
    icon: InfoOutlineIcon,
  },
];
const ROLE_NAV_ALLOWLIST: Record<string, NavItemId[]> = {
  [RoleCodes.SECURITY_GUARD]: [
    'home',
    'violations',
    'operations-room',
    'incidents',
    'incidents-my',
    'incidents-critical',
    'emergency-procedures',
    'cctv-operations',
    'cctv-ops-permits',
    'cctv-ops-referrals',
    'cctv-ops-follow-up',
    'notifications',
    'notification-preferences',
    'communications',
    'tasks',
    'tasks-my',
    'tasks-overdue',
    'shifts',
    'field-operations',
    'field-map',
    'field-patrols',
    'field-checkpoints',
    'field-alerts',
    'reports',
    'reports-performance',
    'reports-saved',
    'about',
  ],
  [RoleCodes.SECURITY_SUPERVISOR]: [
    'home',
    'violations',
    'visitors',
    'operations-room',
    'incidents',
    'incidents-my',
    'incidents-critical',
    'incidents-follow-up',
    'incidents-statistics',
    'emergency-procedures',
    'cctv-operations',
    'cctv-ops-permits',
    'cctv-ops-referrals',
    'cctv-ops-follow-up',
    'cctv-ops-statistics',
    'notifications',
    'notification-preferences',
    'notification-rules',
    'communications',
    'tasks',
    'tasks-my',
    'tasks-overdue',
    'tasks-statistics',
    'settings',
    'shifts',
    'shift-handover',
    'shift-stats',
    'field-operations',
    'field-map',
    'field-patrols',
    'field-patrol-routes',
    'field-checkpoints',
    'field-alerts',
    'field-zones',
    'field-statistics',
    'reports',
    'reports-performance',
    'reports-saved',
    'about',
  ],
  [RoleCodes.CCTV_OPERATOR]: [
    'home',
    'violations',
    'operations-room',
    'incidents',
    'incidents-my',
    'incidents-critical',
    'emergency-procedures',
    'cctv',
    'cctv-operations',
    'cctv-ops-permits',
    'cctv-ops-referrals',
    'cctv-ops-follow-up',
    'cctv-ops-statistics',
    'notifications',
    'notification-preferences',
    'communications',
    'tasks',
    'tasks-my',
    'tasks-overdue',
    'shifts',
    'field-operations',
    'field-map',
    'field-checkpoints',
    'field-alerts',
    'reports',
    'reports-performance',
    'reports-saved',
    'about',
  ],
  [RoleCodes.OPERATIONS_MANAGER]: [
    'home',
    'violations',
    'visitors',
    'operations-room',
    'incidents',
    'incidents-my',
    'incidents-critical',
    'incidents-follow-up',
    'incidents-statistics',
    'emergency-procedures',
    'cctv',
    'cctv-operations',
    'cctv-ops-permits',
    'cctv-ops-referrals',
    'cctv-ops-follow-up',
    'cctv-ops-statistics',
    'users',
    'notifications',
    'notification-preferences',
    'notification-rules',
    'communications',
    'tasks',
    'tasks-my',
    'tasks-overdue',
    'tasks-statistics',
    'statistics',
    'settings',
    'shifts',
    'shift-handover',
    'shift-stats',
    'field-operations',
    'field-map',
    'field-patrols',
    'field-patrol-routes',
    'field-checkpoints',
    'field-alerts',
    'field-zones',
    'field-statistics',
    'reports',
    'reports-performance',
    'reports-saved',
    'reports-schedules',
    'audit-logs',
    'about',
  ],
  [RoleCodes.PROJECT_MANAGER]: [
    'home',
    'statistics',
    'operations-room',
    'incidents',
    'incidents-critical',
    'incidents-statistics',
    'emergency-procedures',
    'cctv',
    'cctv-operations',
    'cctv-ops-permits',
    'cctv-ops-referrals',
    'cctv-ops-follow-up',
    'cctv-ops-statistics',
    'notifications',
    'notification-preferences',
    'communications',
    'tasks',
    'tasks-my',
    'tasks-overdue',
    'tasks-statistics',
    'shifts',
    'shift-handover',
    'shift-stats',
    'field-operations',
    'field-map',
    'field-patrols',
    'field-patrol-routes',
    'field-checkpoints',
    'field-alerts',
    'field-zones',
    'field-statistics',
    'reports',
    'reports-performance',
    'reports-saved',
    'audit-logs',
    'about',
  ],
  [RoleCodes.SECURITY_DIRECTOR]: [
    'home',
    'violations',
    'visitors',
    'operations-room',
    'incidents',
    'incidents-my',
    'incidents-critical',
    'incidents-follow-up',
    'incidents-statistics',
    'emergency-procedures',
    'cctv',
    'cctv-operations',
    'cctv-ops-permits',
    'cctv-ops-referrals',
    'cctv-ops-follow-up',
    'cctv-ops-statistics',
    'director',
    'complaints',
    'users',
    'permissions',
    'notifications',
    'notification-preferences',
    'notification-rules',
    'communications',
    'tasks',
    'tasks-my',
    'tasks-overdue',
    'tasks-statistics',
    'statistics',
    'settings',
    'shifts',
    'shift-handover',
    'shift-stats',
    'field-operations',
    'field-map',
    'field-patrols',
    'field-patrol-routes',
    'field-checkpoints',
    'field-alerts',
    'field-zones',
    'field-statistics',
    'reports',
    'reports-performance',
    'reports-saved',
    'reports-schedules',
    'audit-logs',
    'about',
  ],
};
export interface AccessContext {
  roleCode: string;
  permissions: string[];
}
export function hasPermission(
  permissions: string[],
  required?: string[],
): boolean {
  if (!required?.length) return true;
  return required.some((p) => permissions.includes(p));
}
export function hasRole(roleCode: string, roles?: string[]): boolean {
  if (!roles?.length) return true;
  return roles.includes(roleCode);
}
export function canAccessNavItem(item: NavItem, ctx: AccessContext): boolean {
  const allowlist = ROLE_NAV_ALLOWLIST[ctx.roleCode];
  if (allowlist && !allowlist.includes(item.id)) {
    return false;
  }
  const permissionOk = hasPermission(ctx.permissions, item.permissions);
  const roleOk = hasRole(ctx.roleCode, item.roles);
  if (item.permissions?.length && item.roles?.length) {
    return permissionOk || roleOk;
  }
  if (item.permissions?.length) return permissionOk;
  if (item.roles?.length) return roleOk;
  return true;
}
export function getVisibleNavItems(ctx: AccessContext): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccessNavItem(item, ctx));
}
export function canAccessRoute(path: string, ctx: AccessContext): boolean {
  if (path.startsWith('/director')) {
    const directorItem = NAV_ITEMS.find((nav) => nav.id === 'director');
    if (directorItem) return canAccessNavItem(directorItem, ctx);
  }
  if (path.startsWith('/operations-room')) {
    const item = NAV_ITEMS.find((nav) => nav.id === 'operations-room');
    if (item) return canAccessNavItem(item, ctx);
  }
  if (path.startsWith('/emergency-procedures')) {
    const item = NAV_ITEMS.find((nav) => nav.id === 'emergency-procedures');
    if (item) return canAccessNavItem(item, ctx);
  }
  if (path.startsWith('/notifications')) {
    if (path.startsWith('/notifications/preferences')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'notification-preferences');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/notifications/rules')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'notification-rules');
      if (item) return canAccessNavItem(item, ctx);
    }
    const item = NAV_ITEMS.find((nav) => nav.id === 'notifications');
    if (item) return canAccessNavItem(item, ctx);
  }
  if (path.startsWith('/communications')) {
    const item = NAV_ITEMS.find((nav) => nav.id === 'communications');
    if (item) return canAccessNavItem(item, ctx);
  }
  if (path.startsWith('/tasks')) {
    if (path.startsWith('/tasks/statistics')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'tasks-statistics');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/tasks/overdue')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'tasks-overdue');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/tasks/my')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'tasks-my');
      if (item) return canAccessNavItem(item, ctx);
    }
    const item = NAV_ITEMS.find((nav) => nav.id === 'tasks');
    if (item) return canAccessNavItem(item, ctx);
  }
  if (path.startsWith('/incidents')) {
    if (path.startsWith('/incidents/my-incidents')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'incidents-my');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/incidents/critical')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'incidents-critical');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/incidents/follow-up')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'incidents-follow-up');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/incidents/statistics')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'incidents-statistics');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/incidents/new')) {
      return hasPermission(ctx.permissions, [
        PermissionCodes.INCIDENTS_CREATE,
      ]);
    }
    // /incidents/:id and list
    const item = NAV_ITEMS.find((nav) => nav.id === 'incidents');
    if (item) return canAccessNavItem(item, ctx);
  }
  if (path.startsWith('/cctv-operations')) {
    if (path.startsWith('/cctv-operations/statistics')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'cctv-ops-statistics');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/cctv-operations/follow-up')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'cctv-ops-follow-up');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/cctv-operations/referrals')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'cctv-ops-referrals');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/cctv-operations/permits')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'cctv-ops-permits');
      if (item) return canAccessNavItem(item, ctx);
    }
    const overviewItem = NAV_ITEMS.find((nav) => nav.id === 'cctv-operations');
    if (overviewItem) return canAccessNavItem(overviewItem, ctx);
  }
  if (path.startsWith('/cctv')) {
    const cctvItem = NAV_ITEMS.find((nav) => nav.id === 'cctv');
    if (cctvItem) return canAccessNavItem(cctvItem, ctx);
  }
  if (path.startsWith('/complaints')) {
    const complaintsItem = NAV_ITEMS.find((nav) => nav.id === 'complaints');
    if (complaintsItem) return canAccessNavItem(complaintsItem, ctx);
  }
  if (path.startsWith('/shifts')) {
    if (path.startsWith('/shifts/handover')) {
      const handoverItem = NAV_ITEMS.find((nav) => nav.id === 'shift-handover');
      if (handoverItem) return canAccessNavItem(handoverItem, ctx);
    }
    if (path.startsWith('/shifts/statistics')) {
      const statsItem = NAV_ITEMS.find((nav) => nav.id === 'shift-stats');
      if (statsItem) return canAccessNavItem(statsItem, ctx);
    }
    const shiftsItem = NAV_ITEMS.find((nav) => nav.id === 'shifts');
    if (shiftsItem) return canAccessNavItem(shiftsItem, ctx);
  }
  if (path.startsWith('/field-operations')) {
    if (path.startsWith('/field-operations/patrols/routes')) {
      const routesItem = NAV_ITEMS.find((nav) => nav.id === 'field-patrol-routes');
      if (routesItem) return canAccessNavItem(routesItem, ctx);
    }
    if (path.startsWith('/field-operations/statistics')) {
      const statsItem = NAV_ITEMS.find((nav) => nav.id === 'field-statistics');
      if (statsItem) return canAccessNavItem(statsItem, ctx);
    }
    if (path.startsWith('/field-operations/checkpoints')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'field-checkpoints');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/field-operations/alerts')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'field-alerts');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/field-operations/zones')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'field-zones');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/field-operations/patrols')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'field-patrols');
      if (item) return canAccessNavItem(item, ctx);
    }
    if (path.startsWith('/field-operations/map')) {
      const item = NAV_ITEMS.find((nav) => nav.id === 'field-map');
      if (item) return canAccessNavItem(item, ctx);
    }
    const overviewItem = NAV_ITEMS.find((nav) => nav.id === 'field-operations');
    if (overviewItem) return canAccessNavItem(overviewItem, ctx);
  }
  if (path === '/about') {
    return true;
  }
  const item = NAV_ITEMS.find((nav) => nav.path === path);
  if (!item) return true;
  return canAccessNavItem(item, ctx);
}
export const NAV_LABELS: Record<string, string> = Object.fromEntries(
  NAV_ITEMS.map((item) => [item.path, item.label]),
);
NAV_LABELS['/profile'] = 'الملف الشخصي';
NAV_LABELS['/cctv/operations'] = 'شاشة العمليات';
NAV_LABELS['/cctv/incidents'] = 'البلاغات المباشرة';
NAV_LABELS['/cctv/violations'] = 'مخالفات المركبات';
NAV_LABELS['/cctv/case-proofs'] = 'إثبات الحالات';
NAV_LABELS['/cctv/inquiries'] = 'طلبات الاستعلام';
NAV_LABELS['/director/users'] = 'إدارة المستخدمين';
NAV_LABELS['/director/permissions'] = 'إدارة الصلاحيات';
NAV_LABELS['/director/complaints'] = 'إدارة الشكاوى';
NAV_LABELS['/director/statistics'] = 'الإحصائيات';
NAV_LABELS['/director/reports'] = 'التقارير';
NAV_LABELS['/director/settings'] = 'إعدادات النظام';
NAV_LABELS['/shifts'] = 'إدارة الورديات';
NAV_LABELS['/shifts/handover'] = 'تسليم واستلام الوردية';
NAV_LABELS['/shifts/statistics'] = 'إحصائيات الورديات';
NAV_LABELS['/field-operations'] = 'العمليات الميدانية';
NAV_LABELS['/field-operations/map'] = 'الخريطة الأمنية';
NAV_LABELS['/field-operations/patrols'] = 'الجولات الأمنية';
NAV_LABELS['/field-operations/patrols/routes'] = 'مسارات الجولات';
NAV_LABELS['/field-operations/checkpoints'] = 'النقاط الأمنية';
NAV_LABELS['/field-operations/alerts'] = 'التنبيهات الميدانية';
NAV_LABELS['/field-operations/zones'] = 'المواقع والمناطق';
NAV_LABELS['/field-operations/statistics'] = 'إحصائيات العمليات الميدانية';
NAV_LABELS['/cctv-operations'] = 'مركز عمليات المراقبة';
NAV_LABELS['/cctv-operations/permits'] = 'التصاريح';
NAV_LABELS['/cctv-operations/permits/new'] = 'إنشاء تصريح';
NAV_LABELS['/cctv-operations/referrals'] = 'الإحالات الأمنية';
NAV_LABELS['/cctv-operations/referrals/new'] = 'إنشاء إحالة أمنية';
NAV_LABELS['/cctv-operations/follow-up'] = 'متابعة الحالات';
NAV_LABELS['/cctv-operations/statistics'] = 'إحصائيات عمليات المراقبة';
NAV_LABELS['/operations-room'] = 'غرفة العمليات الأمنية';
NAV_LABELS['/incidents'] = 'البلاغات والحوادث';
NAV_LABELS['/incidents/new'] = 'تسجيل حادث';
NAV_LABELS['/incidents/my-incidents'] = 'الحوادث المسندة إليّ';
NAV_LABELS['/incidents/critical'] = 'الحالات الحرجة';
NAV_LABELS['/incidents/follow-up'] = 'المتابعة اللاحقة';
NAV_LABELS['/incidents/statistics'] = 'إحصائيات الحوادث';
NAV_LABELS['/emergency-procedures'] = 'إجراءات الطوارئ';
NAV_LABELS['/about'] = 'حول النظام';
NAV_LABELS['/reports'] = 'مركز التقارير';
NAV_LABELS['/reports/daily'] = 'التقرير الأمني اليومي';
NAV_LABELS['/reports/shifts'] = 'تقارير الورديات';
NAV_LABELS['/reports/handover'] = 'تسليم واستلام الوردية';
NAV_LABELS['/reports/incidents'] = 'تقرير الحوادث';
NAV_LABELS['/reports/patrols'] = 'تقرير الجولات الأمنية';
NAV_LABELS['/reports/cctv-referrals'] = 'تقرير إحالات كاميرات المراقبة';
NAV_LABELS['/reports/permits'] = 'تقرير التصاريح';
NAV_LABELS['/reports/visitors'] = 'تقرير الزوار';
NAV_LABELS['/reports/vehicle-violations'] = 'تقرير مخالفات المركبات';
NAV_LABELS['/reports/performance'] = 'مؤشرات الأداء';
NAV_LABELS['/reports/custom'] = 'منشئ التقارير المخصص';
NAV_LABELS['/reports/saved'] = 'التقارير المحفوظة';
NAV_LABELS['/reports/schedules'] = 'جدولة التقارير';
NAV_LABELS['/audit-logs'] = 'سجلات التدقيق';
NAV_LABELS['/notifications'] = 'مركز الإشعارات';
NAV_LABELS['/notifications/preferences'] = 'تفضيلات الإشعارات';
NAV_LABELS['/notifications/rules'] = 'قواعد الإشعارات';
NAV_LABELS['/communications'] = 'الاتصالات الداخلية';
NAV_LABELS['/tasks'] = 'مركز المهام';
NAV_LABELS['/tasks/my'] = 'مهامي';
NAV_LABELS['/tasks/overdue'] = 'المهام المتأخرة';
NAV_LABELS['/tasks/statistics'] = 'إحصائيات المهام';

