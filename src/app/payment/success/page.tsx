import { Suspense } from 'react';
import PaymentSuccessStatus from './PaymentSuccessStatus';

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#08080b] text-sm text-[#a2a2ab]">
          Confirming payment…
        </main>
      }
    >
      <PaymentSuccessStatus />
    </Suspense>
  );
}
