import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { UserStatus } from '@prisma/client';
import { corsOrigins } from '../../config/env.js';
import { prisma } from '../database/prisma.js';
import { verifyAccessToken } from '../security/jwt.js';
import { logger } from '../logging/logger.js';

let io: Server | null = null;

function extractToken(
  authToken: unknown,
  authorizationHeader: string | undefined,
): string | null {
  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }
  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim();
  }
  return null;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = extractToken(
        socket.handshake.auth?.token,
        socket.handshake.headers.authorization,
      );

      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      const payload = verifyAccessToken(token);
      const user = await prisma.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
        include: { role: { select: { code: true } } },
      });

      if (!user || user.status === UserStatus.SUSPENDED || user.status === UserStatus.INACTIVE) {
        next(new Error('Unauthorized'));
        return;
      }

      // NEVER trust client-supplied userId/role/group for rooms — derive from JWT + DB.
      socket.data.userId = user.id;
      socket.data.roleCode = user.role.code;
      socket.data.groupId = user.groupId;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    const roleCode = socket.data.roleCode as string | undefined;
    const groupId = socket.data.groupId as string | null | undefined;

    void socket.join(`user:${userId}`);
    if (roleCode) {
      void socket.join(`role:${roleCode}`);
    }
    if (groupId) {
      void socket.join(`group:${groupId}`);
    }

    // Optional: join conversation rooms only after server validates membership
    socket.on('conversation:join', async (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !conversationId) return;
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId,
          userId,
          leftAt: null,
          conversation: { deletedAt: null },
        },
      });
      if (!participant) return;
      void socket.join(`conversation:${conversationId}`);
    });

    socket.on('conversation:leave', (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !conversationId) return;
      void socket.leave(`conversation:${conversationId}`);
    });

    logger.debug('Socket connected', { userId, socketId: socket.id, roleCode, groupId });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId, socketId: socket.id });
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}

export function getSocketServer(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(roleCode: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`role:${roleCode}`).emit(event, payload);
}

export function emitToGroup(groupId: string, event: string, payload: unknown): void {
  if (!io) return;
  io.to(`group:${groupId}`).emit(event, payload);
}

export function emitToConversation(
  conversationId: string,
  event: string,
  payload: unknown,
): void {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
}

export function broadcast(event: string, payload: unknown): void {
  if (!io) return;
  io.emit(event, payload);
}
