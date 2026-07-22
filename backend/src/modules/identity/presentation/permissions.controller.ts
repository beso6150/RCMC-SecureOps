import { Request, Response } from 'express';
import { permissionService } from '../application/PermissionService.js';
import { RequestMeta } from '../domain/types.js';
import { CreatePermissionBody, CreatePolicyBody } from './permissions.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class PermissionsController {
  list = async (_req: Request, res: Response): Promise<void> => {
    const permissions = await permissionService.listPermissions();
    res.status(200).json({ success: true, data: permissions });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePermissionBody;
    const permission = await permissionService.createPermission(
      req.user!.id,
      body,
      requestMeta(req),
    );
    res.status(201).json({ success: true, data: permission });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const permission = await permissionService.updatePermission(
      req.user!.id,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data: permission });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await permissionService.softDeletePermission(req.user!.id, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  listPolicies = async (req: Request, res: Response): Promise<void> => {
    const permissionId =
      typeof req.query.permissionId === 'string' ? req.query.permissionId : undefined;
    const policies = await permissionService.listPolicies(permissionId);
    res.status(200).json({ success: true, data: policies });
  };

  createPolicy = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePolicyBody;
    const policy = await permissionService.createPolicy(req.user!.id, body, requestMeta(req));
    res.status(201).json({ success: true, data: policy });
  };

  updatePolicy = async (req: Request, res: Response): Promise<void> => {
    const policy = await permissionService.updatePolicy(
      req.user!.id,
      req.params.id!,
      req.body,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data: policy });
  };

  removePolicy = async (req: Request, res: Response): Promise<void> => {
    await permissionService.softDeletePolicy(req.user!.id, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };
}

export const permissionsController = new PermissionsController();
