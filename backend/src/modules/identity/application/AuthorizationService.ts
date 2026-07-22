import { prisma } from '../../../shared/database/prisma.js';
import { AuthenticatedUser, AuthContext, PolicyConditions } from '../domain/types.js';
import { RoleCodes } from '../domain/roleCodes.js';

function resolveContextPath(context: AuthContext, path: string): unknown {
  if (path === 'context.incidentHandling') {
    return context.incidentHandling === true;
  }
  if (path.startsWith('context.')) {
    const key = path.slice('context.'.length) as keyof AuthContext;
    return context[key];
  }
  return undefined;
}

function evaluatePolicy(
  conditions: PolicyConditions,
  context: AuthContext,
  roleCode: string,
): boolean | null {
  if (conditions.appliesToRoles?.length && !conditions.appliesToRoles.includes(roleCode)) {
    return null;
  }

  const when = conditions.when;
  if (!when) {
    return conditions.effect === 'allow';
  }

  if (when.unless) {
    const unlessValue = resolveContextPath(context, when.unless);
    if (unlessValue) {
      return null;
    }
  }

  if (when.require) {
    const requireValue = resolveContextPath(context, when.require);
    if (!requireValue) {
      return false;
    }
  }

  return conditions.effect === 'allow';
}

class AuthorizationService {
  async hasPermission(
    user: AuthenticatedUser,
    permissionCode: string,
    context: AuthContext = {},
  ): Promise<boolean> {
    if (!user.permissions.includes(permissionCode)) {
      return false;
    }

    // Security Director: full permissions, policies do not restrict
    if (user.roleCode === RoleCodes.SECURITY_DIRECTOR) {
      return true;
    }

    const permission = await prisma.permission.findFirst({
      where: { code: permissionCode, deletedAt: null },
      include: {
        permissionPolicies: {
          where: { isActive: true, deletedAt: null },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!permission) {
      return false;
    }

    for (const policy of permission.permissionPolicies) {
      const conditions = policy.conditions as unknown as PolicyConditions;
      const result = evaluatePolicy(conditions, context, user.roleCode);
      if (result === null) {
        continue;
      }
      return result;
    }

    return true;
  }

  async hasAllPermissions(
    user: AuthenticatedUser,
    codes: string[],
    context: AuthContext = {},
  ): Promise<boolean> {
    for (const code of codes) {
      if (!(await this.hasPermission(user, code, context))) {
        return false;
      }
    }
    return true;
  }

  async hasAnyPermission(
    user: AuthenticatedUser,
    codes: string[],
    context: AuthContext = {},
  ): Promise<boolean> {
    for (const code of codes) {
      if (await this.hasPermission(user, code, context)) {
        return true;
      }
    }
    return false;
  }

  async canReadPhone(user: AuthenticatedUser, context: AuthContext = {}): Promise<boolean> {
    return this.hasPermission(user, 'users:read_phone', context);
  }
}

export const authorizationService = new AuthorizationService();
