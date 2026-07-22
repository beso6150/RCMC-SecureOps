import { Request, Response } from 'express';
import { roleService } from '../application/RoleService.js';
import { RequestMeta } from '../domain/types.js';
import { SetRolePermissionsBody } from './roles.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class RolesController {
  list = async (_req: Request, res: Response): Promise<void> => {
    const roles = await roleService.list();
    res.status(200).json({ success: true, data: roles });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const role = await roleService.getById(req.params.id!);
    res.status(200).json({ success: true, data: role });
  };

  setPermissions = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as SetRolePermissionsBody;
    const role = await roleService.setPermissions(
      req.user!.id,
      req.params.id!,
      body.permissionIds,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data: role });
  };
}

export const rolesController = new RolesController();
