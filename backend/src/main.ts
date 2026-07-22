import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './shared/database/prisma.js';
import { logger } from './shared/logging/logger.js';
import { initSocketServer } from './shared/realtime/socketServer.js';
import { shiftRosterService } from './modules/shifts/application/ShiftRosterService.js';
import { runNotificationEscalationSafely } from './modules/notifications/application/NotificationEscalationService.js';

async function bootstrap(): Promise<void> {
  const app = createApp();

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (err) {
    logger.error('Failed to connect to database', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  const httpServer = http.createServer(app);
  initSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info('RCMC SecureOps API listening', {
      port: env.PORT,
      env: env.NODE_ENV,
    });
  });

  const shiftIntervalMs = 60_000;
  const runShiftMaintenance = () => {
    void shiftRosterService.ensureCurrentSessions().catch((err) => {
      logger.error('Shift session maintenance failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    void shiftRosterService.checkAndSendEndingAlerts().catch((err) => {
      logger.error('Shift ending alerts failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  };

  runShiftMaintenance();
  setInterval(runShiftMaintenance, shiftIntervalMs);

  // Sprint 19: notification reminder / escalation worker (advisory lock inside)
  const notificationIntervalMs = 60_000;
  void runNotificationEscalationSafely();
  setInterval(() => {
    void runNotificationEscalationSafely();
  }, notificationIntervalMs);

  const shutdown = async (signal: string) => {
    logger.info('Shutting down', { signal });
    httpServer.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
