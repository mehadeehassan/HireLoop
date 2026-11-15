import { connection } from 'next/server';
import AuthForm from '@/components/auth/AuthForm';
import { getPublicPlatformSettings } from '@/lib/platform-settings';

export const instant = false;

type SignInPageProps = {
  searchParams: Promise<{ verification?: string | string[]; error?: string | string[] }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  await connection();
  const params = await searchParams;
  const platform = await getPublicPlatformSettings();
  const error = typeof params.error === 'string' ? params.error : null;
  const verificationResult =
    error === 'TOKEN_EXPIRED'
      ? 'expired'
      : error
        ? 'invalid'
        : params.verification === 'success'
          ? 'success'
          : undefined;
  return (
    <AuthForm mode="signin" platform={platform} verificationResult={verificationResult} />
  );
}
