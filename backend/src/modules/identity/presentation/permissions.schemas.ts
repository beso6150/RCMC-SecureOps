import { z } from 'zod';

const policyConditionsSchema = z.object({
  effect: z.enum(['allow', 'deny']),
  appliesToRoles: z.array(z.string().min(1)).optional(),
  when: z
    .object({
      field: z.string().optional(),
      unless: z.string().optional(),
      require: z.string().optional(),
    })
    .optional(),
});

export const createPermissionSchema = z.object({
  code: z.string().trim().min(3).max(100),
  resource: z.string().trim().min(1).max(50),
  action: z.string().trim().min(1).max(50),
  description: z.string().trim().max(500).nullable().optional(),
});

export const updatePermissionSchema = z.object({
  description: z.string().trim().max(500).nullable().optional(),
});

export const permissionIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const createPolicySchema = z.object({
  permissionId: z.string().uuid(),
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).nullable().optional(),
  conditions: policyConditionsSchema,
  priority: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});

export const updatePolicySchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  conditions: policyConditionsSchema.optional(),
  priority: z.number().int().min(0).max(10_000).optional(),
  isActive: z.boolean().optional(),
});

export const listPoliciesQuerySchema = z.object({
  permissionId: z.string().uuid().optional(),
});

export type CreatePermissionBody = z.infer<typeof createPermissionSchema>;
export type CreatePolicyBody = z.infer<typeof createPolicySchema>;
