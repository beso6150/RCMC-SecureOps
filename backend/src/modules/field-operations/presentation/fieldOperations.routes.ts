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
import { fieldOperationsController } from './fieldOperations.controller.js';
import {
  assignSessionSchema,
  cancelAlertSchema,
  cancelSessionSchema,
  createAlertSchema,
  createCheckpointSchema,
  createRouteSchema,
  createSessionSchema,
  createZoneSchema,
  idParamsSchema,
  incidentIdParamsSchema,
  listAlertsQuerySchema,
  listCheckpointsQuerySchema,
  listPersonnelQuerySchema,
  listSessionsQuerySchema,
  listZonesQuerySchema,
  locationUpdateSchema,
  paginationQuerySchema,
  resolveAlertSchema,
  sessionCheckpointParamsSchema,
  sosSchema,
  statisticsQuerySchema,
  updateCheckpointSchema,
  updateRouteSchema,
  updateSessionSchema,
  updateZoneSchema,
  userIdParamsSchema,
  visitCheckpointSchema,
} from './fieldOperations.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/map',
  authorizePermission(PermissionCodes.FIELD_MAP_VIEW),
  asyncHandler(fieldOperationsController.map),
);

router.get(
  '/overview',
  authorizeAnyPermission(PermissionCodes.FIELD_MAP_VIEW, PermissionCodes.PATROL_SESSIONS_VIEW),
  asyncHandler(fieldOperationsController.overview),
);

router.get(
  '/statistics',
  authorizeAnyPermission(PermissionCodes.FIELD_MAP_VIEW, PermissionCodes.PATROL_SESSIONS_VIEW),
  validate(statisticsQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.statistics),
);

// Zones
router.get(
  '/zones',
  authorizePermission(PermissionCodes.SECURITY_ZONES_VIEW),
  validate(listZonesQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.listZones),
);
router.post(
  '/zones',
  authorizePermission(PermissionCodes.SECURITY_ZONES_CREATE),
  validate(createZoneSchema),
  asyncHandler(fieldOperationsController.createZone),
);
router.get(
  '/zones/:id',
  authorizePermission(PermissionCodes.SECURITY_ZONES_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.getZone),
);
router.patch(
  '/zones/:id',
  authorizePermission(PermissionCodes.SECURITY_ZONES_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updateZoneSchema),
  asyncHandler(fieldOperationsController.updateZone),
);
router.delete(
  '/zones/:id',
  authorizePermission(PermissionCodes.SECURITY_ZONES_DELETE),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.deleteZone),
);

// Checkpoints
router.get(
  '/checkpoints',
  authorizePermission(PermissionCodes.CHECKPOINTS_VIEW),
  validate(listCheckpointsQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.listCheckpoints),
);
router.post(
  '/checkpoints',
  authorizePermission(PermissionCodes.CHECKPOINTS_CREATE),
  validate(createCheckpointSchema),
  asyncHandler(fieldOperationsController.createCheckpoint),
);
router.get(
  '/checkpoints/:id',
  authorizePermission(PermissionCodes.CHECKPOINTS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.getCheckpoint),
);
router.patch(
  '/checkpoints/:id',
  authorizePermission(PermissionCodes.CHECKPOINTS_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updateCheckpointSchema),
  asyncHandler(fieldOperationsController.updateCheckpoint),
);
router.delete(
  '/checkpoints/:id',
  authorizePermission(PermissionCodes.CHECKPOINTS_DELETE),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.deleteCheckpoint),
);

// Patrol routes
router.get(
  '/patrol-routes',
  authorizePermission(PermissionCodes.PATROL_ROUTES_VIEW),
  validate(paginationQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.listRoutes),
);
router.post(
  '/patrol-routes',
  authorizePermission(PermissionCodes.PATROL_ROUTES_MANAGE),
  validate(createRouteSchema),
  asyncHandler(fieldOperationsController.createRoute),
);
router.get(
  '/patrol-routes/:id',
  authorizePermission(PermissionCodes.PATROL_ROUTES_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.getRoute),
);
router.patch(
  '/patrol-routes/:id',
  authorizePermission(PermissionCodes.PATROL_ROUTES_MANAGE),
  validate(idParamsSchema, 'params'),
  validate(updateRouteSchema),
  asyncHandler(fieldOperationsController.updateRoute),
);
router.delete(
  '/patrol-routes/:id',
  authorizePermission(PermissionCodes.PATROL_ROUTES_MANAGE),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.deleteRoute),
);

// Patrol sessions
router.get(
  '/patrol-sessions',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_VIEW),
  validate(listSessionsQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.listSessions),
);
router.post(
  '/patrol-sessions',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_CREATE),
  validate(createSessionSchema),
  asyncHandler(fieldOperationsController.createSession),
);
router.get(
  '/patrol-sessions/:id',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.getSession),
);
router.patch(
  '/patrol-sessions/:id',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_CREATE),
  validate(idParamsSchema, 'params'),
  validate(updateSessionSchema),
  asyncHandler(fieldOperationsController.updateSession),
);
router.post(
  '/patrol-sessions/:id/assign',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_ASSIGN),
  validate(idParamsSchema, 'params'),
  validate(assignSessionSchema),
  asyncHandler(fieldOperationsController.assignSession),
);
router.post(
  '/patrol-sessions/:id/start',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_START),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.startSession),
);
router.post(
  '/patrol-sessions/:id/checkpoints/:checkpointId/visit',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_START),
  validate(sessionCheckpointParamsSchema, 'params'),
  validate(visitCheckpointSchema),
  asyncHandler(fieldOperationsController.visitCheckpoint),
);
router.post(
  '/patrol-sessions/:id/complete',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_COMPLETE),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.completeSession),
);
router.post(
  '/patrol-sessions/:id/cancel',
  authorizePermission(PermissionCodes.PATROL_SESSIONS_CANCEL),
  validate(idParamsSchema, 'params'),
  validate(cancelSessionSchema),
  asyncHandler(fieldOperationsController.cancelSession),
);

// Personnel
router.get(
  '/personnel',
  authorizePermission(PermissionCodes.PERSONNEL_LOCATIONS_VIEW),
  validate(listPersonnelQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.listPersonnel),
);
router.get(
  '/personnel/:userId/location',
  authorizePermission(PermissionCodes.PERSONNEL_LOCATIONS_VIEW),
  validate(userIdParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.getPersonnelLocation),
);
router.post(
  '/personnel/location',
  authorizePermission(PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_SELF),
  validate(locationUpdateSchema),
  asyncHandler(fieldOperationsController.updateSelfLocation),
);
router.post(
  '/personnel/:userId/location/manual',
  authorizePermission(PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_ANY),
  validate(userIdParamsSchema, 'params'),
  validate(locationUpdateSchema),
  asyncHandler(fieldOperationsController.updateManualLocation),
);

// Incidents nearest
router.get(
  '/incidents/:incidentId/nearest-personnel',
  authorizeAnyPermission(PermissionCodes.PERSONNEL_LOCATIONS_VIEW, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.nearestPersonnel),
);

// Alerts — SOS before :id routes
router.get(
  '/alerts',
  authorizePermission(PermissionCodes.FIELD_ALERTS_VIEW),
  validate(listAlertsQuerySchema, 'query'),
  asyncHandler(fieldOperationsController.listAlerts),
);
router.post(
  '/alerts',
  authorizePermission(PermissionCodes.FIELD_ALERTS_CREATE),
  validate(createAlertSchema),
  asyncHandler(fieldOperationsController.createAlert),
);
router.post(
  '/alerts/sos',
  authorizePermission(PermissionCodes.FIELD_ALERTS_CREATE),
  validate(sosSchema),
  asyncHandler(fieldOperationsController.createSos),
);
router.post(
  '/alerts/:id/acknowledge',
  authorizePermission(PermissionCodes.FIELD_ALERTS_ACKNOWLEDGE),
  validate(idParamsSchema, 'params'),
  asyncHandler(fieldOperationsController.acknowledgeAlert),
);
router.post(
  '/alerts/:id/resolve',
  authorizePermission(PermissionCodes.FIELD_ALERTS_RESOLVE),
  validate(idParamsSchema, 'params'),
  validate(resolveAlertSchema),
  asyncHandler(fieldOperationsController.resolveAlert),
);
router.post(
  '/alerts/:id/cancel',
  authorizePermission(PermissionCodes.FIELD_ALERTS_RESOLVE),
  validate(idParamsSchema, 'params'),
  validate(cancelAlertSchema),
  asyncHandler(fieldOperationsController.cancelAlert),
);

export default router;
