import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { corsOrigins } from './config/env.js';
import {
  errorHandler,
  notFoundHandler,
  requestIdMiddleware,
} from './shared/middleware/index.js';
import { identityRouter } from './modules/identity/index.js';
import { violationsRouter } from './modules/violations/index.js';
import { visitorsRouter } from './modules/visitors/index.js';
import { incidentsRouter } from './modules/incidents/index.js';
import { notificationsRouter } from './modules/notifications/index.js';
import { tasksRouter } from './modules/tasks/index.js';
import { communicationsRouter } from './modules/communications/index.js';
import { dashboardRouter } from './modules/dashboard/index.js';
import { cctvRouter } from './modules/cctv/index.js';
import { cctvOperationsRouter } from './modules/cctv-operations/index.js';
import { complaintsRouter } from './modules/complaints/index.js';
import { directorRouter } from './modules/director/index.js';
import { reportsRouter } from './modules/reports/index.js';
import { settingsRouter } from './modules/settings/index.js';
import { uploadsRouter } from './modules/uploads/index.js';
import { shiftsRouter } from './modules/shifts/index.js';
import { fieldOperationsRouter } from './modules/field-operations/index.js';
import { mobileRouter } from './modules/mobile/index.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '70mb' }));
  app.use(express.urlencoded({ extended: false, limit: '70mb' }));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        service: 'rcmc-secureops-api',
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/api/v1', identityRouter);
  app.use('/api/v1', violationsRouter);
  app.use('/api/v1', visitorsRouter);
  app.use('/api/v1', incidentsRouter);
  app.use('/api/v1', notificationsRouter);
  app.use('/api/v1', tasksRouter);
  app.use('/api/v1', communicationsRouter);
  app.use('/api/v1', dashboardRouter);
  app.use('/api/v1', cctvRouter);
  app.use('/api/v1', cctvOperationsRouter);
  app.use('/api/v1', complaintsRouter);
  app.use('/api/v1', directorRouter);
  app.use('/api/v1', reportsRouter);
  app.use('/api/v1', settingsRouter);
  app.use('/api/v1', uploadsRouter);
  app.use('/api/v1', shiftsRouter);
  app.use('/api/v1', fieldOperationsRouter);
  app.use('/api/v1', mobileRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
