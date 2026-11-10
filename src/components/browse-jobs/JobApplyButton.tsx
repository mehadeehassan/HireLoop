'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';

type SeekerProfile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  experience: string;
  skills: string;
  linkedinUrl: string;
  resumeUrl: string;
  portfolioUrl: string;
  coverLetter: string;
};

type ResumeFile = {
  name: string;
  type: string;
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
  coverLetter: '',
};

const maxResumeSize = 5 * 1024 * 1024;

function readResumeFile(file: File): Promise<ResumeFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the selected resume.'));
        return;
      }

      const base64 = reader.result.split(',')[1];
      if (!base64) {
        reject(new Error('Could not read the selected resume.'));
        return;
      }

      resolve({ name: file.name, type: file.type || 'application/pdf', data: base64 });
    };
    reader.onerror = () => reject(new Error('Could not read the selected resume.'));
    reader.readAsDataURL(file);
  });
}

function getSignInHref(jobId: string) {
  const returnTo = `/browse-jobs/${encodeURIComponent(jobId)}?apply=1`;
  return `/signin?callbackUrl=${encodeURIComponent(returnTo)}`;
}

function TextField({
  label,
  name,
  value,
  onChange,
  required = false,
  type = 'text',
  placeholder,
  readOnly = false,
}: {
  label: string;
  name: keyof SeekerProfile;
  value: string;
  onChange: (name: keyof SeekerProfile, value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block text-xs text-[#b8b8c2]">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        readOnly={readOnly}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full rounded-md border border-white/[0.08] bg-[#1a1a1d] px-3 text-sm text-white outline-none placeholder:text-[#686870] focus:border-[#8178ff] read-only:cursor-not-allowed read-only:opacity-70"
      />
    </label>
  );
}

export default function JobApplyButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState<SeekerProfile>(emptyProfile);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const startedAutoApply = useRef(false);
  const className =
    'inline-flex h-10 items-center justify-center rounded-lg bg-white px-5 text-xs font-semibold text-[#171719] transition hover:bg-[#dedee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8178ff] disabled:cursor-not-allowed disabled:opacity-60';

  const openForm = useCallback(async () => {
    if (showForm || applied) return;
    setShowForm(true);
    setLoadingProfile(true);

    try {
      const response = await fetch('/api/seeker/profile', { cache: 'no-store' });
      if (!response.ok) throw new Error('Could not load your seeker profile.');
      const savedProfile: unknown = await response.json();
      const values =
        typeof savedProfile === 'object' && savedProfile !== null
          ? (savedProfile as Partial<SeekerProfile>)
          : {};

      setProfile({
        name: values.name || session?.user.name || '',
        email: values.email || session?.user.email || '',
        phone: values.phone || '',
        location: values.location || '',
        experience: values.experience || '',
        skills: values.skills || '',
        linkedinUrl: values.linkedinUrl || '',
        resumeUrl: values.resumeUrl || '',
        portfolioUrl: values.portfolioUrl || '',
        coverLetter: values.coverLetter || '',
      });
    } catch (error) {
      console.error('Could not load seeker profile for application', error);
      setProfile((current) => ({
        ...current,
        name: current.name || session?.user.name || '',
        email: current.email || session?.user.email || '',
      }));
      toast.error('Profile details could not be loaded. You can still enter them below.');
    } finally {
      setLoadingProfile(false);
    }
  }, [applied, session, showForm]);

  const apply = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (applying || applied) return;
      setApplying(true);

      try {
        const uploadedResume = resumeFile ? await readResumeFile(resumeFile) : null;
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...profile, resumeFile: uploadedResume }),
        });
        const result: unknown = await response.json();
        const payload =
          typeof result === 'object' && result !== null
            ? (result as { error?: unknown; alreadyApplied?: unknown; warning?: unknown })
            : {};

        if (!response.ok) {
          if (payload.alreadyApplied === true) {
            setApplied(true);
            setShowForm(false);
            toast.info('You have already applied for this job.');
            return;
          }
          throw new Error(
            typeof payload.error === 'string'
              ? payload.error
              : 'Could not submit your application.',
          );
        }

        setApplied(true);
        setShowForm(false);
        if (typeof payload.warning === 'string') {
          toast.warning(payload.warning);
        } else {
          toast.success('Your application and profile have been sent to the hiring team.');
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Could not submit your application.',
        );
      } finally {
        setApplying(false);
      }
    },
    [applying, applied, jobId, profile, resumeFile],
  );

  useEffect(() => {
    if (
      isPending ||
      session?.user.role !== 'seeker' ||
      startedAutoApply.current ||
      new URLSearchParams(window.location.search).get('apply') !== '1'
    ) {
      return;
    }

    startedAutoApply.current = true;
    void openForm();
    router.replace(`/browse-jobs/${encodeURIComponent(jobId)}`, { scroll: false });
  }, [isPending, session, router, jobId, openForm]);

  function updateProfile(name: keyof SeekerProfile, value: string) {
    if (name === 'resumeUrl' && value) setResumeFile(null);
    setProfile((current) => ({ ...current, [name]: value }));
  }

  function selectResume(file: File | undefined) {
    if (!file) {
      setResumeFile(null);
      return;
    }

    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Upload your resume as a PDF file.');
      return;
    }
    if (file.size > maxResumeSize) {
      toast.error('Resume file must be 5 MB or smaller.');
      return;
    }

    setResumeFile(file);
    setProfile((current) => ({ ...current, resumeUrl: '' }));
  }

  if (isPending) {
    return (
      <button type="button" disabled className={className}>
        Checking...
      </button>
    );
  }

  if (!session?.user) {
    return (
      <Link href={getSignInHref(jobId)} className={className}>
        Apply Now
      </Link>
    );
  }

  if (session.user.role !== 'seeker') {
    return (
      <button type="button" disabled title="Only job seekers can apply" className={className}>
        Seekers Only
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openForm()}
        disabled={applying || applied}
        className={className}
      >
        {applying ? 'Applying...' : applied ? 'Applied' : 'Apply Now'}
      </button>

      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !applying) setShowForm(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-application-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/[0.08] bg-[#111113] p-5 shadow-2xl sm:p-7"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="job-application-title" className="text-lg font-semibold text-white">
                  Apply for this job
                </h2>
                <p className="mt-1 text-xs text-[#92929b]">
                  Add your details so the hiring team can review your application.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close application form"
                disabled={applying}
                onClick={() => setShowForm(false)}
                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/[0.08] text-lg text-[#aaa] hover:bg-white/5 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {loadingProfile ? (
              <div className="mt-6 h-48 animate-pulse rounded-lg bg-white/5" />
            ) : (
              <form onSubmit={apply} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Full name"
                    name="name"
                    value={profile.name}
                    onChange={updateProfile}
                    required
                  />
                  <TextField
                    label="Email"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={updateProfile}
                    required
                    readOnly
                  />
                  <TextField
                    label="Phone number"
                    name="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={updateProfile}
                    required
                  />
                  <TextField
                    label="Location"
                    name="location"
                    value={profile.location}
                    onChange={updateProfile}
                    required
                    placeholder="City, Country"
                  />
                  <TextField
                    label="Experience"
                    name="experience"
                    value={profile.experience}
                    onChange={updateProfile}
                    required
                    placeholder="e.g. 3 years"
                  />
                  <TextField
                    label="Skills (comma separated)"
                    name="skills"
                    value={profile.skills}
                    onChange={updateProfile}
                    required
                    placeholder="React, TypeScript, Node.js"
                  />
                  <TextField
                    label="LinkedIn URL (optional)"
                    name="linkedinUrl"
                    type="url"
                    value={profile.linkedinUrl}
                    onChange={updateProfile}
                    placeholder="https://www.linkedin.com/in/your-profile"
                  />
                  <TextField
                    label="Resume URL"
                    name="resumeUrl"
                    type="url"
                    value={profile.resumeUrl}
                    onChange={updateProfile}
                    placeholder="Paste a resume link or upload a PDF below"
                  />
                  <div className="block text-xs text-[#b8b8c2]">
                    Or upload resume (PDF, max 5 MB)
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(event) => selectResume(event.target.files?.[0])}
                      className="mt-1.5 block w-full text-xs text-[#92929b] file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-white hover:file:bg-white/15"
                    />
                    {resumeFile && (
                      <span className="mt-1 block truncate text-[#c5c5cc]">
                        Selected: {resumeFile.name}
                      </span>
                    )}
                  </div>
                  <TextField
                    label="Portfolio URL (optional)"
                    name="portfolioUrl"
                    type="url"
                    value={profile.portfolioUrl}
                    onChange={updateProfile}
                    placeholder="https://..."
                  />
                </div>
                <label className="block text-xs text-[#b8b8c2]">
                  Cover letter
                  <textarea
                    rows={5}
                    maxLength={5000}
                    value={profile.coverLetter}
                    onChange={(event) => updateProfile('coverLetter', event.target.value)}
                    placeholder="Tell the hiring team why you are a good fit."
                    className="mt-1.5 w-full resize-y rounded-md border border-white/[0.08] bg-[#1a1a1d] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#686870] focus:border-[#8178ff]"
                  />
                </label>
                <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => setShowForm(false)}
                    className="h-10 rounded-lg border border-white/[0.08] px-4 text-xs text-[#c5c5cc] hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={applying} className={className}>
                    {applying ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
