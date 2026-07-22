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
import { cctvOperationsController } from './cctvOperations.controller.js';
import {
  acknowledgeShareSchema,
  addAttachmentSchema,
  assignReferralSchema,
  attachmentParamsSchema,
  closeReferralSchema,
  createPermitSchema,
  createReferralSchema,
  escalateReferralSchema,
  idParamsSchema,
  listPermitsQuerySchema,
  listReferralsQuerySchema,
  noteSchema,
  reasonSchema,
  requestInfoSchema,
  resolveReferralSchema,
  sharePermitSchema,
  statisticsQuerySchema,
  updateReferralSchema,
  updatePermitSchema,
} from './cctvOperations.schemas.js';

const router = Router();

router.use(authenticateJwt, requirePasswordChanged);

router.get(
  '/dashboard',
  authorizePermission(PermissionCodes.CCTV_OPS_DASHBOARD_VIEW),
  asyncHandler(cctvOperationsController.dashboard),
);
router.get(
  '/active-personnel',
  authorizeAnyPermission(
    PermissionCodes.CCTV_OPS_DASHBOARD_VIEW,
    PermissionCodes.SECURITY_REFERRALS_ASSIGN,
    PermissionCodes.PERMITS_SHARE,
  ),
  asyncHandler(cctvOperationsController.activePersonnel),
);
router.get(
  '/current-shift',
  authorizeAnyPermission(
    PermissionCodes.CCTV_OPS_DASHBOARD_VIEW,
    PermissionCodes.SHIFTS_READ,
    PermissionCodes.SECURITY_REFERRALS_VIEW,
  ),
  asyncHandler(cctvOperationsController.currentShift),
);

router.get(
  '/permits/statistics',
  authorizeAnyPermission(PermissionCodes.PERMITS_VIEW, PermissionCodes.CCTV_OPS_DASHBOARD_VIEW),
  validate(statisticsQuerySchema, 'query'),
  asyncHandler(cctvOperationsController.permitStatistics),
);
router.get(
  '/permits',
  authorizePermission(PermissionCodes.PERMITS_VIEW),
  validate(listPermitsQuerySchema, 'query'),
  asyncHandler(cctvOperationsController.listPermits),
);
router.post(
  '/permits',
  authorizePermission(PermissionCodes.PERMITS_CREATE),
  validate(createPermitSchema),
  asyncHandler(cctvOperationsController.createPermit),
);
router.get(
  '/permits/:id',
  authorizePermission(PermissionCodes.PERMITS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.getPermit),
);
router.patch(
  '/permits/:id',
  authorizePermission(PermissionCodes.PERMITS_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updatePermitSchema),
  asyncHandler(cctvOperationsController.updatePermit),
);
router.post(
  '/permits/:id/activate',
  authorizePermission(PermissionCodes.PERMITS_ACTIVATE),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.activatePermit),
);
router.post(
  '/permits/:id/cancel',
  authorizePermission(PermissionCodes.PERMITS_CANCEL),
  validate(idParamsSchema, 'params'),
  validate(reasonSchema),
  asyncHandler(cctvOperationsController.cancelPermit),
);
router.post(
  '/permits/:id/reject',
  authorizePermission(PermissionCodes.PERMITS_REJECT),
  validate(idParamsSchema, 'params'),
  validate(reasonSchema),
  asyncHandler(cctvOperationsController.rejectPermit),
);
router.post(
  '/permits/:id/mark-used',
  authorizeAnyPermission(PermissionCodes.PERMITS_UPDATE, PermissionCodes.PERMITS_ACTIVATE),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.markPermitUsed),
);
router.post(
  '/permits/:id/share',
  authorizePermission(PermissionCodes.PERMITS_SHARE),
  validate(idParamsSchema, 'params'),
  validate(sharePermitSchema),
  asyncHandler(cctvOperationsController.sharePermit),
);
router.get(
  '/permits/:id/shares',
  authorizePermission(PermissionCodes.PERMITS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.listPermitShares),
);
router.post(
  '/permits/:id/acknowledge',
  authorizePermission(PermissionCodes.PERMITS_ACKNOWLEDGE),
  validate(idParamsSchema, 'params'),
  validate(acknowledgeShareSchema),
  asyncHandler(cctvOperationsController.acknowledgePermitShare),
);
router.get(
  '/permits/:id/attachment',
  authorizePermission(PermissionCodes.PERMITS_DOWNLOAD_ATTACHMENT),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.downloadPermitAttachment),
);
router.get(
  '/permits/:id/attachment/preview',
  authorizePermission(PermissionCodes.PERMITS_DOWNLOAD_ATTACHMENT),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.previewPermitAttachment),
);

router.get(
  '/referrals/statistics',
  authorizeAnyPermission(
    PermissionCodes.SECURITY_REFERRALS_VIEW,
    PermissionCodes.CCTV_OPS_DASHBOARD_VIEW,
  ),
  validate(statisticsQuerySchema, 'query'),
  asyncHandler(cctvOperationsController.referralStatistics),
);
router.post(
  '/referrals/process-escalations',
  authorizeAnyPermission(
    PermissionCodes.SECURITY_REFERRALS_ESCALATE,
    PermissionCodes.SECURITY_REFERRALS_ASSIGN,
  ),
  asyncHandler(cctvOperationsController.processEscalations),
);
router.get(
  '/referrals',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_VIEW),
  validate(listReferralsQuerySchema, 'query'),
  asyncHandler(cctvOperationsController.listReferrals),
);
router.post(
  '/referrals',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_CREATE),
  validate(createReferralSchema),
  asyncHandler(cctvOperationsController.createReferral),
);
router.get(
  '/referrals/:id',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.getReferral),
);
router.patch(
  '/referrals/:id',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_UPDATE),
  validate(idParamsSchema, 'params'),
  validate(updateReferralSchema),
  asyncHandler(cctvOperationsController.updateReferral),
);
router.post(
  '/referrals/:id/send',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_SEND),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.sendReferral),
);
router.post(
  '/referrals/:id/assign',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_ASSIGN),
  validate(idParamsSchema, 'params'),
  validate(assignReferralSchema),
  asyncHandler(cctvOperationsController.assignReferral),
);
router.post(
  '/referrals/:id/reassign',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_ASSIGN),
  validate(idParamsSchema, 'params'),
  validate(assignReferralSchema),
  asyncHandler(cctvOperationsController.assignReferral),
);
router.post(
  '/referrals/:id/receive',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_RECEIVE),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.receiveReferral),
);
router.post(
  '/referrals/:id/start',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_START),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.startReferral),
);
router.post(
  '/referrals/:id/arrive',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_ARRIVE),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.arriveReferral),
);
router.post(
  '/referrals/:id/request-info',
  authorizeAnyPermission(
    PermissionCodes.SECURITY_REFERRALS_ADD_NOTE,
    PermissionCodes.SECURITY_REFERRALS_UPDATE,
  ),
  validate(idParamsSchema, 'params'),
  validate(requestInfoSchema),
  asyncHandler(cctvOperationsController.requestInfo),
);
router.post(
  '/referrals/:id/resolve',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_RESOLVE),
  validate(idParamsSchema, 'params'),
  validate(resolveReferralSchema),
  asyncHandler(cctvOperationsController.resolveReferral),
);
router.post(
  '/referrals/:id/reject',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_REJECT),
  validate(idParamsSchema, 'params'),
  validate(reasonSchema),
  asyncHandler(cctvOperationsController.rejectReferral),
);
router.post(
  '/referrals/:id/cancel',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_CANCEL),
  validate(idParamsSchema, 'params'),
  validate(reasonSchema),
  asyncHandler(cctvOperationsController.cancelReferral),
);
router.post(
  '/referrals/:id/escalate',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_ESCALATE),
  validate(idParamsSchema, 'params'),
  validate(escalateReferralSchema),
  asyncHandler(cctvOperationsController.escalateReferral),
);
router.post(
  '/referrals/:id/close',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_CLOSE),
  validate(idParamsSchema, 'params'),
  validate(closeReferralSchema),
  asyncHandler(cctvOperationsController.closeReferral),
);
router.post(
  '/referrals/:id/notes',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_ADD_NOTE),
  validate(idParamsSchema, 'params'),
  validate(noteSchema),
  asyncHandler(cctvOperationsController.addNote),
);
router.get(
  '/referrals/:id/timeline',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.getTimeline),
);
router.get(
  '/referrals/:id/attachments',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_VIEW),
  validate(idParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.getAttachments),
);
router.post(
  '/referrals/:id/attachments',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_UPLOAD_ATTACHMENT),
  validate(idParamsSchema, 'params'),
  validate(addAttachmentSchema),
  asyncHandler(cctvOperationsController.addAttachment),
);
router.get(
  '/referrals/:id/attachments/:attachmentId/preview',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_DOWNLOAD_ATTACHMENT),
  validate(attachmentParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.previewAttachment),
);
router.get(
  '/referrals/:id/attachments/:attachmentId/download',
  authorizePermission(PermissionCodes.SECURITY_REFERRALS_DOWNLOAD_ATTACHMENT),
  validate(attachmentParamsSchema, 'params'),
  asyncHandler(cctvOperationsController.downloadAttachment),
);

export default router;
