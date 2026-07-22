import { Request, Response } from 'express';
import { uploadService } from '../application/UploadService.js';
import { UploadBase64Body } from './uploads.schemas.js';

export class UploadsController {
  uploadBase64 = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as UploadBase64Body;
    const data = await uploadService.saveBase64(body);
    res.status(201).json({ success: true, data });
  };
}

export const uploadsController = new UploadsController();
