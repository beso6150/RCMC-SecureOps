import { Request, Response } from 'express';
import { userService } from '../application/UserService.js';
import { RequestMeta } from '../domain/types.js';
import { CreateUserBody, UpdateUserBody } from './users.schemas.js';

function requestMeta(req: Request): RequestMeta {
  return {
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    requestId: req.requestId,
  };
}

export class UsersController {
  list = async (req: Request, res: Response): Promise<void> => {
    const result = await userService.list(req.user!, req.query as never, req.authContext);
    res.status(200).json({ success: true, ...result });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const user = await userService.getById(req.user!, req.params.id!, req.authContext);
    res.status(200).json({ success: true, data: user });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateUserBody;
    const user = await userService.create(req.user!.id, body, requestMeta(req));
    res.status(201).json({ success: true, data: user });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UpdateUserBody;
    const user = await userService.update(
      req.user!,
      req.params.id!,
      body,
      requestMeta(req),
      req.authContext,
    );
    res.status(200).json({ success: true, data: user });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await userService.softDelete(req.user!.id, req.params.id!, requestMeta(req));
    res.status(200).json({ success: true, data: { deleted: true } });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const data = await userService.resetPassword(
      req.user!,
      req.params.id!,
      req.body?.temporaryPassword,
      requestMeta(req),
    );
    res.status(200).json({ success: true, data });
  };
}

export const usersController = new UsersController();
