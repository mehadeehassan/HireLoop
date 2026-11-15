import { connection } from 'next/server';
import PasswordResetForm from '@/components/auth/PasswordResetForm';

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  await connection();
  const params = await searchParams;
  const token = typeof params.token === 'string' ? params.token : null;
  return (
    <PasswordResetForm
      mode="reset"
      token={token}
      invalidToken={params.error === 'INVALID_TOKEN'}
    />
  );
}
