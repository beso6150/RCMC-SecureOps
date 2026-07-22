import { Router } from 'express';
import { z } from 'zod';
import {
  authenticateJwt,
  authorizePermission,
  authorizeAnyPermission,
  requirePasswordChanged,
  validate,
} from '../../../shared/middleware/index.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { incidentsController } from './incidents.controller.js';
import {
  addAttachmentsSchema,
  addCommentSchema,
  assignIncidentSchema,
  cancelIncidentSchema,
  closeIncidentSchema,
  createIncidentSchema,
  createIncidentTypeSchema,
  holdIncidentSchema,
  incidentIdParamsSchema,
  incidentTypeIdParamsSchema,
  listIncidentsQuerySchema,
  syncPullQuerySchema,
  syncPushSchema,
  updateIncidentSchema,
  updateIncidentTypeSchema,
} from './incidents.schemas.js';
import {
  addContactLogSchema,
  addFollowUpSchema,
  addNoteSchema,
  addTaskSchema,
  alertIdParamsSchema,
  applyProcedureSchema,
  assessIncidentSchema,
  assignOpsSchema,
  attachmentIdParamsSchema,
  completeFollowUpSchema,
  completeProcedureStepSchema,
  completeTaskSchema,
  convertForceSchema,
  createProcedureSchema,
  escalateIncidentSchema,
  falseAlarmSchema,
  followUpIdParamsSchema,
  operationsLiveQuerySchema,
  operationsStatsQuerySchema,
  procedureIdParamsSchema,
  reassignIncidentSchema,
  referralIdParamsSchema,
  reopenIncidentSchema,
  requestSupportSchema,
  resolveIncidentSchema,
  taskIdParamsSchema,
  updateProcedureSchema,
  uploadOpsAttachmentSchema,
  violationIdParamsSchema,
} from './operations.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/types',
  authorizePermission(PermissionCodes.INCIDENTS_READ),
  asyncHandler(incidentsController.listTypes),
);

router.post(
  '/types',
  authorizePermission(PermissionCodes.INCIDENTS_UPDATE),
  validate(createIncidentTypeSchema),
  asyncHandler(incidentsController.createType),
);

router.patch(
  '/types/:typeId',
  authorizePermission(PermissionCodes.INCIDENTS_UPDATE),
  validate(incidentTypeIdParamsSchema, 'params'),
  validate(updateIncidentTypeSchema),
  asyncHandler(incidentsController.updateType),
);

router.get(
  '/parking-locations',
  authorizePermission(PermissionCodes.INCIDENTS_READ),
  asyncHandler(incidentsController.parkingLocations),
);

router.post(
  '/sync/push',
  authorizePermission(PermissionCodes.INCIDENTS_CREATE),
  validate(syncPushSchema),
  asyncHandler(incidentsController.syncPush),
);

router.get(
  '/sync/pull',
  authorizePermission(PermissionCodes.INCIDENTS_READ),
  validate(syncPullQuerySchema, 'query'),
  asyncHandler(incidentsController.syncPull),
);

// ─── Sprint 17: Operations room & conversions (before /:id) ───

router.get(
  '/operations-room/dashboard',
  authorizeAnyPermission(
    PermissionCodes.OPERATIONS_ROOM_VIEW,
    PermissionCodes.OPERATIONS_ROOM_MANAGE,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ),
  asyncHandler(incidentsController.opsDashboard),
);

router.get(
  '/operations-room/live',
  authorizeAnyPermission(
    PermissionCodes.OPERATIONS_ROOM_VIEW,
    PermissionCodes.OPERATIONS_ROOM_MANAGE,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ),
  validate(operationsLiveQuerySchema, 'query'),
  asyncHandler(incidentsController.opsLive),
);

router.get(
  '/operations-room/statistics',
  authorizeAnyPermission(
    PermissionCodes.OPERATIONS_ROOM_VIEW,
    PermissionCodes.OPERATIONS_ROOM_MANAGE,
    PermissionCodes.INCIDENTS_VIEW_ALL,
  ),
  validate(operationsStatsQuerySchema, 'query'),
  asyncHandler(incidentsController.opsStatistics),
);

router.get(
  '/emergency-procedures',
  authorizeAnyPermission(
    PermissionCodes.EMERGENCY_PROCEDURES_VIEW,
    PermissionCodes.EMERGENCY_PROCEDURES_MANAGE,
    PermissionCodes.INCIDENTS_READ,
  ),
  asyncHandler(incidentsController.listProcedures),
);

router.post(
  '/emergency-procedures',
  authorizePermission(PermissionCodes.EMERGENCY_PROCEDURES_MANAGE),
  validate(createProcedureSchema),
  asyncHandler(incidentsController.createProcedure),
);

router.get(
  '/emergency-procedures/:procedureId',
  authorizeAnyPermission(
    PermissionCodes.EMERGENCY_PROCEDURES_VIEW,
    PermissionCodes.EMERGENCY_PROCEDURES_MANAGE,
    PermissionCodes.INCIDENTS_READ,
  ),
  validate(procedureIdParamsSchema, 'params'),
  asyncHandler(incidentsController.getProcedure),
);

router.patch(
  '/emergency-procedures/:procedureId',
  authorizePermission(PermissionCodes.EMERGENCY_PROCEDURES_MANAGE),
  validate(procedureIdParamsSchema, 'params'),
  validate(updateProcedureSchema),
  asyncHandler(incidentsController.updateProcedure),
);

router.delete(
  '/emergency-procedures/:procedureId',
  authorizePermission(PermissionCodes.EMERGENCY_PROCEDURES_MANAGE),
  validate(procedureIdParamsSchema, 'params'),
  asyncHandler(incidentsController.deleteProcedure),
);

router.post(
  '/from-referral/:referralId',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_CONVERT_REFERRAL,
    PermissionCodes.INCIDENTS_CREATE,
  ),
  validate(referralIdParamsSchema, 'params'),
  validate(convertForceSchema),
  asyncHandler(incidentsController.fromReferral),
);

router.post(
  '/from-field-alert/:alertId',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_CONVERT_ALERT,
    PermissionCodes.INCIDENTS_CREATE,
  ),
  validate(alertIdParamsSchema, 'params'),
  validate(convertForceSchema),
  asyncHandler(incidentsController.fromFieldAlert),
);

router.post(
  '/from-violation/:violationId',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_CONVERT_VIOLATION,
    PermissionCodes.INCIDENTS_CREATE,
  ),
  validate(violationIdParamsSchema, 'params'),
  validate(convertForceSchema),
  asyncHandler(incidentsController.fromViolation),
);

router.get(
  '/',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_VIEW_ALL,
    PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
  ),
  validate(listIncidentsQuerySchema, 'query'),
  asyncHandler(incidentsController.list),
);

router.post(
  '/',
  authorizePermission(PermissionCodes.INCIDENTS_CREATE),
  validate(createIncidentSchema),
  asyncHandler(incidentsController.create),
);

// Lifecycle actions on :id (before generic GET/PATCH :id where needed)

router.post(
  '/:id/acknowledge',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ACKNOWLEDGE, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.acknowledge),
);

router.post(
  '/:id/assess',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ASSESS, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(assessIncidentSchema),
  asyncHandler(incidentsController.assess),
);

router.post(
  '/:id/assign',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_HANDLE,
    PermissionCodes.INCIDENTS_ASSIGN,
  ),
  validate(incidentIdParamsSchema, 'params'),
  validate(assignIncidentSchema),
  asyncHandler(incidentsController.assign),
);

router.post(
  '/:id/assign-ops',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ASSIGN, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(assignOpsSchema),
  asyncHandler(incidentsController.assignOps),
);

router.post(
  '/:id/reassign',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_REASSIGN, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(reassignIncidentSchema),
  asyncHandler(incidentsController.reassign),
);

router.post(
  '/:id/respond',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_RESPOND, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.respond),
);

router.post(
  '/:id/arrive',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ARRIVE, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.arrive),
);

router.post(
  '/:id/contain',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_CONTAIN, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.contain),
);

router.post(
  '/:id/resolve',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_RESOLVE, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(resolveIncidentSchema),
  asyncHandler(incidentsController.resolve),
);

router.post(
  '/:id/reopen',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_REOPEN, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(reopenIncidentSchema),
  asyncHandler(incidentsController.reopen),
);

router.post(
  '/:id/false-alarm',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_FALSE_ALARM, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(falseAlarmSchema),
  asyncHandler(incidentsController.falseAlarm),
);

router.post(
  '/:id/escalate',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ESCALATE, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(escalateIncidentSchema),
  asyncHandler(incidentsController.escalate),
);

router.post(
  '/:id/request-support',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_REQUEST_SUPPORT,
    PermissionCodes.INCIDENTS_HANDLE,
  ),
  validate(incidentIdParamsSchema, 'params'),
  validate(requestSupportSchema),
  asyncHandler(incidentsController.requestSupport),
);

router.post(
  '/:id/start',
  authorizePermission(PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.startProgress),
);

router.post(
  '/:id/hold',
  authorizePermission(PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(holdIncidentSchema),
  asyncHandler(incidentsController.hold),
);

router.post(
  '/:id/close',
  authorizePermission(PermissionCodes.INCIDENTS_CLOSE),
  validate(incidentIdParamsSchema, 'params'),
  validate(closeIncidentSchema),
  asyncHandler(incidentsController.close),
);

router.post(
  '/:id/cancel',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_CANCEL, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(cancelIncidentSchema),
  asyncHandler(incidentsController.cancel),
);

router.post(
  '/:id/comments',
  authorizePermission(PermissionCodes.INCIDENTS_COMMENT),
  validate(incidentIdParamsSchema, 'params'),
  validate(addCommentSchema),
  asyncHandler(incidentsController.addComment),
);

router.post(
  '/:id/notes',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_NOTES, PermissionCodes.INCIDENTS_COMMENT),
  validate(incidentIdParamsSchema, 'params'),
  validate(addNoteSchema),
  asyncHandler(incidentsController.addNote),
);

router.get(
  '/:id/notes',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_NOTES,
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_COMMENT,
  ),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.listNotes),
);

router.post(
  '/:id/contacts',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_CONTACTS, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(addContactLogSchema),
  asyncHandler(incidentsController.addContactLog),
);

router.get(
  '/:id/contacts',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_CONTACTS,
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_HANDLE,
  ),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.listContactLogs),
);

router.post(
  '/:id/tasks',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_TASKS, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(addTaskSchema),
  asyncHandler(incidentsController.addTask),
);

router.post(
  '/:id/tasks/:taskId/complete',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_TASKS, PermissionCodes.INCIDENTS_HANDLE),
  validate(taskIdParamsSchema, 'params'),
  validate(completeTaskSchema),
  asyncHandler(incidentsController.completeTask),
);

router.post(
  '/:id/follow-ups',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_FOLLOW_UPS, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  validate(addFollowUpSchema),
  asyncHandler(incidentsController.addFollowUp),
);

router.post(
  '/:id/follow-ups/:followUpId/complete',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_FOLLOW_UPS, PermissionCodes.INCIDENTS_HANDLE),
  validate(followUpIdParamsSchema, 'params'),
  validate(completeFollowUpSchema),
  asyncHandler(incidentsController.completeFollowUp),
);

router.post(
  '/:id/attachments',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ATTACHMENTS, PermissionCodes.INCIDENTS_UPDATE),
  validate(incidentIdParamsSchema, 'params'),
  validate(addAttachmentsSchema),
  asyncHandler(incidentsController.addAttachments),
);

router.post(
  '/:id/attachments/upload',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_ATTACHMENTS, PermissionCodes.INCIDENTS_UPDATE),
  validate(incidentIdParamsSchema, 'params'),
  validate(uploadOpsAttachmentSchema),
  asyncHandler(incidentsController.uploadOpsAttachment),
);

router.get(
  '/:id/attachments/:attachmentId/download',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_ATTACHMENTS,
    PermissionCodes.INCIDENTS_READ,
  ),
  validate(attachmentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.downloadAttachment),
);

router.get(
  '/:id/attachments/:attachmentId/preview',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_ATTACHMENTS,
    PermissionCodes.INCIDENTS_READ,
  ),
  validate(attachmentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.previewAttachment),
);

router.get(
  '/:id/nearest-personnel',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_READ, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.nearestPersonnel),
);

router.get(
  '/:id/nearby-patrols',
  authorizeAnyPermission(PermissionCodes.INCIDENTS_READ, PermissionCodes.INCIDENTS_HANDLE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.nearbyPatrols),
);

router.post(
  '/:id/apply-procedure',
  authorizeAnyPermission(
    PermissionCodes.EMERGENCY_PROCEDURES_VIEW,
    PermissionCodes.INCIDENTS_HANDLE,
  ),
  validate(incidentIdParamsSchema, 'params'),
  validate(applyProcedureSchema),
  asyncHandler(incidentsController.applyProcedure),
);

router.post(
  '/:id/procedure-steps/:stepId/complete',
  authorizeAnyPermission(
    PermissionCodes.EMERGENCY_PROCEDURES_VIEW,
    PermissionCodes.INCIDENTS_HANDLE,
  ),
  validate(
    z.object({
      id: z.string().uuid(),
      stepId: z.string().uuid(),
    }),
    'params',
  ),
  validate(completeProcedureStepSchema),
  asyncHandler(incidentsController.completeProcedureStep),
);

router.get(
  '/:id/pdf',
  authorizePermission(PermissionCodes.INCIDENTS_READ),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.getPdf),
);

router.get(
  '/:id',
  authorizeAnyPermission(
    PermissionCodes.INCIDENTS_READ,
    PermissionCodes.INCIDENTS_VIEW_ALL,
    PermissionCodes.INCIDENTS_VIEW_ASSIGNED,
  ),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.getById),
);

router.patch(
  '/:id',
  authorizePermission(PermissionCodes.INCIDENTS_UPDATE),
  validate(incidentIdParamsSchema, 'params'),
  validate(updateIncidentSchema),
  asyncHandler(incidentsController.update),
);

router.delete(
  '/:id',
  authorizePermission(PermissionCodes.INCIDENTS_UPDATE),
  validate(incidentIdParamsSchema, 'params'),
  asyncHandler(incidentsController.remove),
);

export default router;
