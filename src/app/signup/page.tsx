import { connection } from 'next/server';
import AuthForm from '@/components/auth/AuthForm';
import { getPublicPlatformSettings } from '@/lib/platform-settings';

export const instant = false;

export default async function SignUpPage() {
  await connection();
  const platform = await getPublicPlatformSettings();
  return <AuthForm mode="signup" platform={platform} />;
}
