'use client';

import { useRouter } from 'next/navigation';

export default function MonthlyLimitDialog({ role, canBuyTokens, onClose }: { role: 'seeker' | 'recruiter'; canBuyTokens: boolean; onClose: () => void }) {
  const router = useRouter();
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="monthly-limit-title" className="w-full max-w-sm rounded-xl border border-white/10 bg-[#151519] p-5 text-white shadow-2xl">
      <h2 id="monthly-limit-title" className="text-base font-semibold">Monthly limit reached</h2>
      <p className="mt-2 text-xs leading-5 text-[#aaaab3]">Choose how you would like to continue.</p>
      <div className="mt-5 grid gap-2">
        {canBuyTokens && <button type="button" onClick={() => router.push(`/dashboard/${role}/billing`)} className="rounded-md bg-[#6258ff] px-4 py-2.5 text-xs font-semibold">Buy tokens</button>}
        <button type="button" onClick={() => router.push(`/dashboard/${role}/upgrade?reason=monthly_limit_reached`)} className="rounded-md border border-white/15 px-4 py-2.5 text-xs font-semibold hover:bg-white/5">Upgrade plan</button>
        <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-xs text-[#aaaab3] hover:bg-white/5">Cancel</button>
      </div>
    </section>
  </div>;
}
