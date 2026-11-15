import { admin as adminPlugin } from 'better-auth/plugins';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';

const accessControl = createAccessControl(defaultStatements);
const roles = {
  admin: accessControl.newRole(adminAc.statements),
  seeker: accessControl.newRole({ user: [], session: [] }),
  recruiter: accessControl.newRole({ user: [], session: [] }),
};
const adminPluginInstance = adminPlugin({
  defaultRole: 'seeker',
  adminRoles: ['admin'],
  ac: accessControl,
  roles,
});

export function normalizeCreatedUser(
  user: Record<string, unknown>,
  allowAdminBootstrap: boolean,
) {
  const isBootstrapAdmin = allowAdminBootstrap && user.role === 'admin';
  const role = isBootstrapAdmin
    ? 'admin'
    : user.registrationRole === 'recruiter'
      ? 'recruiter'
      : 'seeker';

  return {
    ...user,
    role,
    registrationRole: undefined,
  };
}

export function createHireLoopAuthRoleConfig() {
  return {
    user: {
      additionalFields: {
        role: {
          type: 'string' as const,
          input: false as const,
          required: false as const,
        },
        registrationRole: {
          type: 'string' as const,
          input: true as const,
          required: false as const,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: Record<string, unknown>) => ({
            data: normalizeCreatedUser(
              user,
              process.env.HIRELOOP_ADMIN_BOOTSTRAP === 'true',
            ),
          }),
        },
      },
    },
    plugins: [adminPluginInstance] as [typeof adminPluginInstance],
  };
}
