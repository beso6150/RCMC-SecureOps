import { Router } from 'express';
import authRoutes from './presentation/auth.routes.js';
import usersRoutes from './presentation/users.routes.js';
import rolesRoutes from './presentation/roles.routes.js';
import permissionsRoutes from './presentation/permissions.routes.js';
import auditLogsRoutes from './presentation/auditLogs.routes.js';

export const identityRouter = Router();

identityRouter.use('/auth', authRoutes);
identityRouter.use('/users', usersRoutes);
identityRouter.use('/roles', rolesRoutes);
identityRouter.use('/permissions', permissionsRoutes);
identityRouter.use('/audit-logs', auditLogsRoutes);

export { authService } from './application/AuthService.js';
export { userService } from './application/UserService.js';
export { roleService } from './application/RoleService.js';
export { permissionService } from './application/PermissionService.js';
export { authorizationService } from './application/AuthorizationService.js';
export { auditService } from './application/AuditService.js';
