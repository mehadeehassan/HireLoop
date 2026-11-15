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
) {
  const createdUser: Record<string, unknown> = { ...user, role: 'seeker' };
  delete createdUser.registrationRole;
  return createdUser;
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
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: Record<string, unknown>) => ({
            data: normalizeCreatedUser(user),
          }),
        },
      },
    },
    plugins: [adminPluginInstance] as [typeof adminPluginInstance],
  };
}
