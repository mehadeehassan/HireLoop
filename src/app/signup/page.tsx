import AuthForm from '@/components/auth/AuthForm';
import { getPublicPlatformSettings } from '@/lib/platform-settings';

export const instant = false;

export default async function SignUpPage() {
  const platform = await getPublicPlatformSettings();
  return <AuthForm mode="signup" platform={platform} />;
}
