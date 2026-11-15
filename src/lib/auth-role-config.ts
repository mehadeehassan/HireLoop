import { admin as adminPlugin } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';
import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { getPlatformControls } from '@/lib/platform-settings';
import { fetchBackendWithSecret } from '@/lib/job-api';

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

const maxAvatarBytes = 2 * 1024 * 1024;
const phonePattern = /^\+?[0-9 ()-]{7,20}$/;
const imageDataPattern = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

function normalizeText(value: unknown, label: string, maxLength: number) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') {
    throw new APIError('BAD_REQUEST', { message: `${label} must be a string.` });
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new APIError('BAD_REQUEST', {
      message: `${label} must be at most ${maxLength} characters.`,
    });
  }
  return trimmed;
}

// Better Auth transform: signup/update input যাচাই ও trim করে persist করে।
const optionalTextTransform = (label: string, maxLength: number) => ({
  input: (value: unknown) => normalizeText(value, label, maxLength),
});

const phoneTransform = {
  input: (value: unknown) => {
    const phone = normalizeText(value, 'Phone number', 20);
    if (phone && !phonePattern.test(phone)) {
      throw new APIError('BAD_REQUEST', {
        message: 'Provide a valid phone number with 7–20 digits.',
      });
    }
    return phone;
  },
};

function validateProfileImage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new APIError('BAD_REQUEST', { message: 'Profile image must be an image URL.' });
  }
  if (/^https?:\/\//i.test(value)) return value;
  if (value.length > maxAvatarBytes * 1.4 + 64) {
    throw new APIError('BAD_REQUEST', {
      message: 'Profile image must be a PNG, JPEG, or WebP file of at most 2 MB.',
    });
  }
  const match = imageDataPattern.exec(value);
  if (!match) {
    throw new APIError('BAD_REQUEST', {
      message: 'Profile image must be a PNG, JPEG, or WebP file of at most 2 MB.',
    });
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > maxAvatarBytes) {
    throw new APIError('BAD_REQUEST', {
      message: 'Profile image must be a PNG, JPEG, or WebP file of at most 2 MB.',
    });
  }
  const isPng = bytes
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!isPng && !isJpeg && !isWebp) {
    throw new APIError('BAD_REQUEST', {
      message: 'Profile image content does not match a supported image format.',
    });
  }
  return value;
}

export function normalizeCreatedUser(
  user: Record<string, unknown>,
) {
  const createdUser: Record<string, unknown> = { ...user, role: 'seeker' };
  delete createdUser.registrationRole;
  return createdUser;
}

// Better Auth-এর generic update থেকেও role বদলানো যাবে না এবং name/image যাচাই হবে।
function normalizeUpdatedUser(user: Record<string, unknown>) {
  const updatedUser: Record<string, unknown> = { ...user };
  delete updatedUser.role;
  delete updatedUser.registrationRole;

  if (updatedUser.name !== undefined) {
    if (typeof updatedUser.name !== 'string') {
      throw new APIError('BAD_REQUEST', { message: 'Full name must be a string.' });
    }
    const name = updatedUser.name.trim();
    if (name.length < 2 || name.length > 80) {
      throw new APIError('BAD_REQUEST', {
        message: 'Full name must be between 2 and 80 characters.',
      });
    }
    updatedUser.name = name;
  }

  if (updatedUser.image !== undefined) {
    updatedUser.image = validateProfileImage(updatedUser.image);
  }

  return updatedUser;
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
        phone: {
          type: 'string' as const,
          input: true as const,
          required: false as const,
          defaultValue: '',
          transform: phoneTransform,
        },
        designation: {
          type: 'string' as const,
          input: true as const,
          required: false as const,
          defaultValue: '',
          transform: optionalTextTransform('Designation', 80),
        },
        bio: {
          type: 'string' as const,
          input: true as const,
          required: false as const,
          defaultValue: '',
          transform: optionalTextTransform('Bio', 500),
        },
      },
      // Better Auth-এর supported change-email flow; verified account-এর জন্য
      // verification email provider দরকার, যা এখনো configure করা নেই।
      changeEmail: {
        enabled: true,
        updateEmailWithoutVerification: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: Record<string, unknown>) => {
            const controls = await getPlatformControls();
            if (!controls.seekerRegistration) {
              throw new APIError('FORBIDDEN', {
                message:
                  'New account registration is currently disabled. Please contact support.',
              });
            }
            return { data: normalizeCreatedUser(user) };
          },
          after: async (user: Record<string, unknown>) => {
            if (typeof user.id !== 'string' || !user.id) return;
            const secret = process.env.HIRELOOP_JWT_SECRET;
            if (!secret) return;
            void fetchBackendWithSecret(
              '/admin/notifications/events/user-registered',
              'POST',
              {},
              secret,
              { id: user.id, role: 'seeker' },
            ).catch((error) => console.error('Could not notify admins about new seeker signup', error));
          },
        },
        update: {
          before: async (user: Record<string, unknown>) => ({
            data: normalizeUpdatedUser(user),
          }),
        },
      },
    },
    plugins: [adminPluginInstance] as [typeof adminPluginInstance],
  };
}
