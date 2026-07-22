import { Router } from 'express';
import {
  authenticateJwt,
  authorizePermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import {
  facilitiesController,
  hostsController,
  visitEmailsController,
  visitorsController,
} from './visitors.controller.js';
import {
  createHostSchema,
  createMeetingRoomSchema,
  createVisitorSchema,
  idParamsSchema,
  ingestEmailSchema,
  listEmailsQuerySchema,
  listHostsQuerySchema,
  listMeetingRoomsQuerySchema,
  listVisitorsQuerySchema,
  statisticsQuerySchema,
  updateFloorSchema,
  updateHostSchema,
  updateMeetingRoomSchema,
  updateVisitorSchema,
} from './visitors.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

// ── Statistics ──────────────────────────────────────────────────
router.get(
  '/statistics',
  authorizePermission(PermissionCodes.VISITORS_STATS),
  validate(statisticsQuerySchema, 'query'),
  asyncHandler(visitorsController.statistics),
);

// ── Hosts ───────────────────────────────────────────────────────
router.get(
  '/hosts',
  authorizePermission(PermissionCodes.HOSTS_READ),
  validate(listHostsQuerySchema, 'query'),
  asyncHandler(hostsController.list),
);
router.post(
  '/hosts',
  authorizePermission(PermissionCodes.HOSTS_CREATE),
  validate(createHostSchema),
  asyncHandler(hostsController.create),
);
router.get(
  '/hosts/:id',
  authorizePermission(PermissionCodes.HOSTS_READ),
  validate(idParamsSchema, 'params'),
  asyncHandler(hostsController.getById),
);
router.patch(
  '/hosts/:id',
  authorizePermission(PermissionCodes.HOSTS_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updateHostSchema),
  asyncHandler(hostsController.update),
);
router.delete(
  '/hosts/:id',
  authorizePermission(PermissionCodes.HOSTS_DELETE),
  validate(idParamsSchema, 'params'),
  asyncHandler(hostsController.remove),
);

// ── Floors ──────────────────────────────────────────────────────
router.get(
  '/floors',
  authorizePermission(PermissionCodes.FLOORS_READ),
  asyncHandler(facilitiesController.listFloors),
);
router.get(
  '/floors/:id',
  authorizePermission(PermissionCodes.FLOORS_READ),
  validate(idParamsSchema, 'params'),
  asyncHandler(facilitiesController.getFloor),
);
router.patch(
  '/floors/:id',
  authorizePermission(PermissionCodes.FLOORS_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updateFloorSchema),
  asyncHandler(facilitiesController.updateFloor),
);

// ── Meeting rooms ───────────────────────────────────────────────
router.get(
  '/meeting-rooms',
  authorizePermission(PermissionCodes.MEETING_ROOMS_READ),
  validate(listMeetingRoomsQuerySchema, 'query'),
  asyncHandler(facilitiesController.listRooms),
);
router.post(
  '/meeting-rooms',
  authorizePermission(PermissionCodes.MEETING_ROOMS_MANAGE),
  validate(createMeetingRoomSchema),
  asyncHandler(facilitiesController.createRoom),
);
router.get(
  '/meeting-rooms/:id',
  authorizePermission(PermissionCodes.MEETING_ROOMS_READ),
  validate(idParamsSchema, 'params'),
  asyncHandler(facilitiesController.getRoom),
);
router.patch(
  '/meeting-rooms/:id',
  authorizePermission(PermissionCodes.MEETING_ROOMS_MANAGE),
  validate(idParamsSchema, 'params'),
  validate(updateMeetingRoomSchema),
  asyncHandler(facilitiesController.updateRoom),
);
router.delete(
  '/meeting-rooms/:id',
  authorizePermission(PermissionCodes.MEETING_ROOMS_MANAGE),
  validate(idParamsSchema, 'params'),
  asyncHandler(facilitiesController.removeRoom),
);

// ── Visit emails (mail parser prep) ─────────────────────────────
router.get(
  '/emails',
  authorizePermission(PermissionCodes.VISIT_EMAILS_READ),
  validate(listEmailsQuerySchema, 'query'),
  asyncHandler(visitEmailsController.list),
);
router.post(
  '/emails/ingest',
  authorizePermission(PermissionCodes.VISIT_EMAILS_INGEST),
  validate(ingestEmailSchema),
  asyncHandler(visitEmailsController.ingest),
);

// ── Visitors ────────────────────────────────────────────────────
router.get(
  '/',
  authorizePermission(PermissionCodes.VISITORS_READ),
  validate(listVisitorsQuerySchema, 'query'),
  asyncHandler(visitorsController.list),
);
router.post(
  '/',
  authorizePermission(PermissionCodes.VISITORS_CREATE),
  validate(createVisitorSchema),
  asyncHandler(visitorsController.create),
);
router.get(
  '/:id/history',
  authorizePermission(PermissionCodes.VISITORS_READ),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.history),
);
router.get(
  '/:id/notifications',
  authorizePermission(PermissionCodes.VISITORS_READ),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.notifications),
);
router.post(
  '/:id/arrive',
  authorizePermission(PermissionCodes.VISITORS_ARRIVE),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.arrive),
);
router.post(
  '/:id/start-meeting',
  authorizePermission(PermissionCodes.VISITORS_UPDATE),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.startMeeting),
);
router.post(
  '/:id/complete',
  authorizePermission(PermissionCodes.VISITORS_UPDATE),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.complete),
);
router.post(
  '/:id/cancel',
  authorizePermission(PermissionCodes.VISITORS_UPDATE),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.cancel),
);
router.get(
  '/:id',
  authorizePermission(PermissionCodes.VISITORS_READ),
  validate(idParamsSchema, 'params'),
  asyncHandler(visitorsController.getById),
);
router.patch(
  '/:id',
  authorizePermission(PermissionCodes.VISITORS_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updateVisitorSchema),
  asyncHandler(visitorsController.update),
);

export default router;
