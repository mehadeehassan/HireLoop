'use client';

import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function RecruiterSettings() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [applicationAlerts, setApplicationAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    recruiterName: '',
    companyName: '',
    email: '',
    phone: '',
    companySize: '',
    industry: '',
    companyWebsite: '',
    companyLogo: '',
    companyDescription: '',
  });

  useEffect(() => {
    let active = true;
    fetch('/api/recruiter/profile')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load recruiter profile');
        return response.json();
      })
      .then((data) => {
        if (!active) return;
        setProfile({
          recruiterName: data.recruiterName || '',
          companyName: data.companyName || '',
          email: data.email || '',
          phone: data.phone || '',
          companySize: data.companySize || '',
          industry: data.industry || '',
          companyWebsite: data.companyWebsite || '',
          companyLogo: data.companyLogo || '',
          companyDescription: data.companyDescription || '',
        });
        setEmailAlerts(data.emailNotifications ?? true);
        setApplicationAlerts(data.applicationNotifications ?? true);
      })
      .catch(() => toast.error('Recruiter profile could not be loaded'))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/recruiter/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          emailNotifications: emailAlerts,
          applicationNotifications: applicationAlerts,
        }),
      });
      if (!response.ok) throw new Error('Unable to save recruiter profile');
      window.dispatchEvent(new Event('recruiter-profile-updated'));
      toast.success('Recruiter settings saved');
    } catch {
      toast.error('Recruiter settings could not be saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-lg border border-[#252d43] bg-[#111827]/55 p-5 sm:p-6">
        <h2 className="text-[14px] font-semibold text-[#edf0f7]">Company Profile</h2>
        <p className="mt-1 text-[10px] leading-5 text-[#81899d]">
          Company details appear on job pages when the company name matches the job listing.
        </p>
        {loading ? (
          <div className="mt-5 h-40 animate-pulse rounded-md bg-[#171e31]" />
        ) : (
          <form onSubmit={saveProfile}>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Recruiter Name"
                value={profile.recruiterName}
                onChange={(value) =>
                  setProfile((current) => ({ ...current, recruiterName: value }))
                }
              />
              <Field
                label="Company Name"
                value={profile.companyName}
                onChange={(value) => setProfile((current) => ({ ...current, companyName: value }))}
              />
              <Field
                label="Email Address"
                type="email"
                value={profile.email}
                onChange={(value) => setProfile((current) => ({ ...current, email: value }))}
              />
              <Field
                label="Phone Number"
                value={profile.phone}
                onChange={(value) => setProfile((current) => ({ ...current, phone: value }))}
              />
              <Field
                label="Company Size"
                placeholder="e.g. 50–100 employees"
                value={profile.companySize}
                onChange={(value) => setProfile((current) => ({ ...current, companySize: value }))}
              />
              <Field
                label="Industry"
                placeholder="e.g. Software & Technology"
                value={profile.industry}
                onChange={(value) => setProfile((current) => ({ ...current, industry: value }))}
              />
              <Field
                label="Company Website"
                type="url"
                placeholder="https://company.com"
                value={profile.companyWebsite}
                onChange={(value) =>
                  setProfile((current) => ({ ...current, companyWebsite: value }))
                }
              />
              <Field
                label="Company Image URL"
                type="url"
                placeholder="https://company.com/image.jpg"
                value={profile.companyLogo}
                onChange={(value) => setProfile((current) => ({ ...current, companyLogo: value }))}
              />
            </div>
            <label className="mt-4 block text-[11px] text-[#aab1c1]">
              Company Overview
              <textarea
                rows={4}
                maxLength={1000}
                placeholder="Introduce your company to job seekers"
                className="mt-2 w-full resize-y rounded-md border border-[#252d43] bg-[#171e31] px-3 py-2.5 text-[12px] text-[#edf0f7] outline-none focus:border-[#6258ff]"
                value={profile.companyDescription}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    companyDescription: event.target.value,
                  }))
                }
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 h-10 rounded-md bg-[#6258ff] px-5 text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </section>
      <section className="rounded-lg border border-[#252d43] bg-[#111827]/55 p-5 sm:p-6">
        <h2 className="text-[14px] font-semibold text-[#edf0f7]">Notifications</h2>
        <Toggle
          label="Email notifications"
          description="Receive weekly hiring summaries"
          enabled={emailAlerts}
          onChange={setEmailAlerts}
        />
        <Toggle
          label="New applications"
          description="Notify when a candidate applies"
          enabled={applicationAlerts}
          onChange={setApplicationAlerts}
        />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const fields =
    'mt-2 h-10.5 w-full rounded-md border border-[#252d43] bg-[#171e31] px-3 text-[12px] text-[#edf0f7] outline-none focus:border-[#6258ff]';
  return (
    <label className="text-[11px] text-[#aab1c1]">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        className={fields}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="mt-5 flex w-full items-center justify-between text-left"
    >
      <span>
        <span className="block text-[12px] text-[#dfe3ec]">{label}</span>
        <span className="mt-1 block text-[10px] text-[#81899d]">{description}</span>
      </span>
      <span
        className={`relative h-5 w-9 rounded-full ${enabled ? 'bg-[#6258ff]' : 'bg-[#343b50]'}`}
      >
        <span
          className={`absolute top-0.5 size-4 rounded-full bg-white transition ${enabled ? 'left-4.5' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}
