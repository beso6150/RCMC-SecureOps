import { Router } from 'express';
import {
  authenticateJwt,
  authorizeAnyPermission,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { reportsController } from './reports.controller.js';
import {
  approvalNotesSchema,
  customReportSchema,
  generateReportSchema,
  kpiQuerySchema,
  listSavedReportsQuerySchema,
  rejectNotesSchema,
  reportDashboardQuerySchema,
  reportExportQuerySchema,
  reportIdParamsSchema,
  reportSummaryQuerySchema,
  scheduleBodySchema,
  scheduleUpdateSchema,
} from './reports.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

// ── Legacy (keep) ──
router.get(
  '/summary',
  authorizeAnyPermission(PermissionCodes.REPORTS_READ, PermissionCodes.REPORTS_DASHBOARD_VIEW),
  validate(reportSummaryQuerySchema, 'query'),
  asyncHandler(reportsController.summary),
);

router.get(
  '/export',
  authorizeAnyPermission(PermissionCodes.REPORTS_READ, PermissionCodes.REPORTS_EXPORT_CSV),
  validate(reportExportQuerySchema, 'query'),
  asyncHandler(reportsController.export),
);

// ── Static Sprint 18 routes (before :id) ──
router.get(
  '/dashboard',
  authorizePermission(PermissionCodes.REPORTS_DASHBOARD_VIEW),
  validate(reportDashboardQuerySchema, 'query'),
  asyncHandler(reportsController.dashboard),
);

router.get(
  '/kpi',
  authorizeAnyPermission(PermissionCodes.KPI_VIEW, PermissionCodes.REPORTS_KPI_VIEW),
  validate(kpiQuerySchema, 'query'),
  asyncHandler(reportsController.kpi),
);

router.get(
  '/schedules',
  authorizeAnyPermission(
    PermissionCodes.REPORTS_SCHEDULES_VIEW,
    PermissionCodes.REPORTS_SCHEDULES_MANAGE,
  ),
  asyncHandler(reportsController.listSchedules),
);

router.post(
  '/schedules',
  authorizePermission(PermissionCodes.REPORTS_SCHEDULES_MANAGE),
  validate(scheduleBodySchema),
  asyncHandler(reportsController.createSchedule),
);

router.get(
  '/schedules/:id',
  authorizeAnyPermission(
    PermissionCodes.REPORTS_SCHEDULES_VIEW,
    PermissionCodes.REPORTS_SCHEDULES_MANAGE,
  ),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.getSchedule),
);

router.patch(
  '/schedules/:id',
  authorizePermission(PermissionCodes.REPORTS_SCHEDULES_MANAGE),
  validate(reportIdParamsSchema, 'params'),
  validate(scheduleUpdateSchema),
  asyncHandler(reportsController.updateSchedule),
);

router.post(
  '/schedules/:id/enable',
  authorizePermission(PermissionCodes.REPORTS_SCHEDULES_MANAGE),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.enableSchedule),
);

router.post(
  '/schedules/:id/disable',
  authorizePermission(PermissionCodes.REPORTS_SCHEDULES_MANAGE),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.disableSchedule),
);

router.post(
  '/schedules/:id/run-now',
  authorizePermission(PermissionCodes.REPORTS_SCHEDULES_MANAGE),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.runScheduleNow),
);

router.delete(
  '/schedules/:id',
  authorizePermission(PermissionCodes.REPORTS_SCHEDULES_MANAGE),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.deleteSchedule),
);

router.get(
  '/',
  authorizeAnyPermission(PermissionCodes.REPORTS_LIST, PermissionCodes.REPORTS_VIEW),
  validate(listSavedReportsQuerySchema, 'query'),
  asyncHandler(reportsController.list),
);

router.post(
  '/generate',
  authorizePermission(PermissionCodes.REPORTS_GENERATE),
  validate(generateReportSchema),
  asyncHandler(reportsController.generate),
);

router.post(
  '/generate/daily',
  authorizeAnyPermission(
    PermissionCodes.REPORTS_GENERATE_DAILY,
    PermissionCodes.REPORTS_GENERATE,
  ),
  validate(generateReportSchema.omit({ reportType: true })),
  asyncHandler(reportsController.generateDaily),
);

router.post(
  '/generate/shift',
  authorizeAnyPermission(
    PermissionCodes.REPORTS_GENERATE_SHIFT,
    PermissionCodes.REPORTS_GENERATE_HANDOVER,
    PermissionCodes.REPORTS_GENERATE,
  ),
  validate(generateReportSchema),
  asyncHandler(reportsController.generateShift),
);

router.post(
  '/custom',
  authorizePermission(PermissionCodes.REPORTS_GENERATE_CUSTOM),
  validate(customReportSchema),
  asyncHandler(reportsController.custom),
);

// ── Per-report actions ──
router.get(
  '/:id/pdf',
  authorizePermission(PermissionCodes.REPORTS_EXPORT_PDF),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.exportPdf),
);

router.get(
  '/:id/csv',
  authorizePermission(PermissionCodes.REPORTS_EXPORT_CSV),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.exportCsv),
);

router.post(
  '/:id/submit',
  authorizePermission(PermissionCodes.REPORTS_SUBMIT),
  validate(reportIdParamsSchema, 'params'),
  validate(approvalNotesSchema),
  asyncHandler(reportsController.submit),
);

router.post(
  '/:id/approve',
  authorizePermission(PermissionCodes.REPORTS_APPROVE),
  validate(reportIdParamsSchema, 'params'),
  validate(approvalNotesSchema),
  asyncHandler(reportsController.approve),
);

router.post(
  '/:id/reject',
  authorizePermission(PermissionCodes.REPORTS_REJECT),
  validate(reportIdParamsSchema, 'params'),
  validate(rejectNotesSchema),
  asyncHandler(reportsController.reject),
);

router.post(
  '/:id/return',
  authorizePermission(PermissionCodes.REPORTS_RETURN),
  validate(reportIdParamsSchema, 'params'),
  validate(approvalNotesSchema),
  asyncHandler(reportsController.returnForEdit),
);

router.post(
  '/:id/archive',
  authorizePermission(PermissionCodes.REPORTS_ARCHIVE),
  validate(reportIdParamsSchema, 'params'),
  validate(approvalNotesSchema),
  asyncHandler(reportsController.archive),
);

router.post(
  '/:id/versions',
  authorizePermission(PermissionCodes.REPORTS_CREATE_VERSION),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.createVersion),
);

router.get(
  '/:id',
  authorizePermission(PermissionCodes.REPORTS_VIEW),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.getById),
);

router.delete(
  '/:id',
  authorizeAnyPermission(PermissionCodes.REPORTS_GENERATE, PermissionCodes.REPORTS_LIST),
  validate(reportIdParamsSchema, 'params'),
  asyncHandler(reportsController.softDelete),
);

export default router;
