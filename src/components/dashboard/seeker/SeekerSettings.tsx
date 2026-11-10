'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import DashboardAvatar from '@/components/dashboard/DashboardAvatar';
import { useSession } from '@/lib/auth-client';
import { FieldError, useFormValidation } from '@/components/form/useFormValidation';
import type { SeekerProfile } from './seeker-data';

type ResumeUpload = {
  name: string;
  type: 'application/pdf';
  data: string;
};

const emptyProfile: SeekerProfile = {
  name: '',
  email: '',
  phone: '',
  location: '',
  experience: '',
  skills: '',
  linkedinUrl: '',
  resumeUrl: '',
  portfolioUrl: '',
  image: '',
  plan: 'Starter',
  hasResume: false,
};

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read the selected file.'));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

function readBase64(file: File): Promise<ResumeUpload> {
  return readDataUrl(file).then((dataUrl) => {
    const data = dataUrl.split(',')[1];
    if (!data) throw new Error('Could not read the selected resume.');
    return { name: file.name, type: 'application/pdf', data };
  });
}

export default function SeekerSettings() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<SeekerProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resumeUpload, setResumeUpload] = useState<ResumeUpload | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const resumeInput = useRef<HTMLInputElement>(null);
  const { errors, validateForm, updateFieldError } = useFormValidation();

  useEffect(() => {
    let active = true;
    fetch('/api/seeker/profile', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load seeker profile.');
        return response.json();
      })
      .then((value: Partial<SeekerProfile>) => {
        if (active) {
          setProfile({
            ...emptyProfile,
            ...value,
            name: value.name || session?.user.name || '',
            email: value.email || session?.user.email || '',
          });
        }
      })
      .catch((error) => {
        console.error('Could not load seeker profile settings', error);
        toast.error('Profile details could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [session?.user.email, session?.user.name]);

  function updateField(key: keyof SeekerProfile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      toast.error('Avatar must be a JPG, PNG, or GIF image.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    try {
      updateField('image', await readDataUrl(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load avatar image.');
    }
  }

  async function selectResume(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Resume must be a PDF file.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Resume file must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    try {
      setResumeUpload(await readBase64(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load resume.');
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateForm(event.currentTarget)) return;
    setSaving(true);
    try {
      const response = await fetch('/api/seeker/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...profile, resumeFile: resumeUpload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your profile.');

      setResumeUpload(null);
      setProfile((current) => ({
        ...current,
        hasResume: current.hasResume || Boolean(resumeUpload) || Boolean(current.resumeUrl),
      }));
      window.dispatchEvent(new Event('seeker-profile-updated'));
      toast.success('Profile saved successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function removeResume() {
    try {
      const response = await fetch('/api/seeker/resume', { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not remove your resume.');
      setProfile((current) => ({ ...current, hasResume: false, resumeUrl: '' }));
      setResumeUpload(null);
      window.dispatchEvent(new Event('seeker-profile-updated'));
      toast.success('Resume removed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove your resume.');
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-7"><div className="h-8 w-40 rounded bg-white/5" /><div className="mt-6 h-80 rounded-xl bg-white/5" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-7">
      <h1 className="text-xl font-semibold text-[#f0f0f3] sm:text-2xl">Settings</h1>
      <p className="mt-1 text-xs text-[#92929b]">Manage your account details and professional profile.</p>

      <form noValidate onSubmit={saveProfile} onChangeCapture={updateFieldError} className="mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,.65fr)]">
        <section className="rounded-xl border border-[#26262b] bg-[#131316] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#ededf2]">Profile Information</h2>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <DashboardAvatar src={profile.image} name={profile.name} size="lg" />
            <div>
              <button type="button" onClick={() => avatarInput.current?.click()} className="rounded-md border border-[#303036] px-3 py-2 text-[10px] text-[#dedee3] hover:bg-white/5">Change Avatar</button>
              <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/gif" onChange={selectAvatar} className="sr-only" />
              <p className="mt-1.5 text-[9px] text-[#85858e]">JPG, GIF, or PNG. Max size 5 MB.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-[10px] text-[#aaaab3]">Full Name
              <input name="name" required minLength={2} value={profile.name} onChange={(event) => updateField('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'seeker-name-error' : undefined} className={inputClass} />
              <FieldError id="seeker-name-error" error={errors.name} />
            </label>
            <label className="text-[10px] text-[#aaaab3]">Email Address
              <input type="email" value={profile.email} readOnly className={`${inputClass} cursor-not-allowed opacity-70`} />
              <span className="mt-1 block text-[9px] text-[#777780]">Email is managed by your sign-in account.</span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#242428] pt-4">
            <button type="submit" disabled={saving} className="rounded-md bg-white px-4 py-2.5 text-[10px] font-semibold text-[#171719] disabled:opacity-50">{saving ? 'Saving...' : 'Update Profile'}</button>
          </div>
        </section>

        <section id="resume" className="rounded-xl border border-[#26262b] bg-[#131316] p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-[#ededf2]">Resume</h2>
          <p className="mt-1 text-[10px] leading-5 text-[#85858e]">Upload your most recent resume for one-click applications.</p>
          <div className="mt-4 rounded-lg border border-dashed border-[#35353b] bg-[#101013] p-5 text-center">
            <span className="mx-auto flex size-9 items-center justify-center rounded-full bg-[#202025] text-[#c8c8d0]" aria-hidden="true">▤</span>
            <p className="mt-3 truncate text-[10px] font-medium text-[#d9d9df]">{resumeUpload?.name || profile.resumeFileName || (profile.resumeUrl ? 'Resume link saved' : profile.hasResume ? 'Resume uploaded' : 'No resume uploaded')}</p>
            <p className="mt-1 text-[9px] text-[#777780]">{resumeUpload ? 'Ready to upload when you save your profile' : profile.hasResume ? 'Your resume is available to hiring teams' : 'PDF file, maximum size 5 MB'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => resumeInput.current?.click()} className="rounded-md border border-[#303036] px-3 py-2 text-[9px] text-[#dedee3] hover:bg-white/5">{profile.hasResume ? 'Replace' : 'Upload Resume'}</button>
              <input ref={resumeInput} type="file" accept="application/pdf,.pdf" onChange={selectResume} className="sr-only" />
              {profile.hasResume && !resumeUpload && profile.resumeFileName && <a href="/api/seeker/resume" className="rounded-md border border-[#303036] px-3 py-2 text-[9px] text-[#dedee3] hover:bg-white/5">Download</a>}
              {profile.resumeUrl && <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="rounded-md border border-[#303036] px-3 py-2 text-[9px] text-[#dedee3] hover:bg-white/5">Open Link</a>}
              {(profile.hasResume || resumeUpload) && <button type="button" onClick={() => void removeResume()} className="rounded-md border border-[#303036] px-3 py-2 text-[9px] text-[#e78b8b] hover:bg-red-500/5">Remove</button>}
            </div>
          </div>
          {resumeUpload && <p className="mt-2 text-[10px] text-amber-300">Save your profile to upload the selected resume.</p>}
        </section>

        <section className="rounded-xl border border-[#26262b] bg-[#131316] p-5 sm:p-6 xl:col-span-1">
          <h2 className="text-sm font-semibold text-[#ededf2]">Professional Details</h2>
          <div className="mt-4 grid gap-4">
            <TextInput label="Professional Headline" value={profile.headline || ''} onChange={(value) => updateField('headline', value)} placeholder="e.g. Senior UX/UI Designer" />
            <label className="text-[10px] text-[#aaaab3]">Bio
              <textarea rows={4} maxLength={2000} value={profile.bio || ''} onChange={(event) => updateField('bio', event.target.value)} placeholder="Tell employers about your experience and strengths." className={`${inputClass} h-auto py-3`} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="Phone" value={profile.phone} onChange={(value) => updateField('phone', value)} />
              <TextInput label="Location" value={profile.location} onChange={(value) => updateField('location', value)} placeholder="City, Country" />
              <TextInput label="Experience" value={profile.experience} onChange={(value) => updateField('experience', value)} placeholder="e.g. 5 years" />
              <TextInput label="LinkedIn URL" value={profile.linkedinUrl} onChange={(value) => updateField('linkedinUrl', value)} placeholder="https://linkedin.com/in/..." />
              <TextInput label="Portfolio URL" value={profile.portfolioUrl} onChange={(value) => updateField('portfolioUrl', value)} placeholder="https://..." />
              <TextInput label="Skills (comma separated)" value={profile.skills} onChange={(value) => updateField('skills', value)} placeholder="Figma, Research, Prototyping" />
            </div>
          </div>
          <div className="mt-5 border-t border-[#242428] pt-4">
            <button type="submit" disabled={saving} className="rounded-md bg-white px-4 py-2.5 text-[10px] font-semibold text-[#171719] disabled:opacity-50">{saving ? 'Saving...' : 'Save Details'}</button>
          </div>
        </section>
      </form>
    </div>
  );
}

const inputClass = 'mt-1.5 h-10 w-full rounded-md border border-[#2b2b31] bg-[#0f0f12] px-3 text-xs text-[#ededf2] outline-none placeholder:text-[#686870] focus:border-[#8178ff]';

function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="text-[10px] text-[#aaaab3]">{label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={inputClass} />
    </label>
  );
}
