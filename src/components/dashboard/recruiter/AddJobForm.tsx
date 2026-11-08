'use client';

import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { recruiterJobCategories, type RecruiterJob } from './recruiter-data';

const fields =
  'h-11 w-full rounded-md border border-[#252d43] bg-[#171e31] px-3 text-[12px] text-[#edf0f7] outline-none placeholder:text-[#737b91] focus:border-[#6258ff]';

function deadlineToInput(deadline: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return deadline;
  }
  const value = new Date(`${deadline}, 12:00:00`);
  if (Number.isNaN(value.getTime())) return '2025-05-30';
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
  ].join('-');
}

export default function AddJobForm({
  mode = 'create',
  initialJob,
  onSave,
}: {
  mode?: 'create' | 'edit';
  initialJob?: RecruiterJob;
  onSave?: (job: Partial<RecruiterJob>) => void;
}) {
  const [jobType, setJobType] = useState(initialJob?.type || 'Full-time');
  const [remote, setRemote] = useState(
    initialJob?.remote ?? initialJob?.location?.includes('Remote') ?? true,
  );
  const [saved, setSaved] = useState(false);
  const salaryValues = initialJob?.compensation?.match(/\$[\d,]+k?/gi) || [];
  const minSalary = mode === 'edit' ? salaryValues[0] || '' : '';
  const maxSalary = mode === 'edit' ? salaryValues[1] || '' : '';
  const category =
    initialJob?.category && recruiterJobCategories.some((option) => option === initialJob.category)
      ? initialJob.category
      : initialJob?.department === 'Engineering'
        ? 'Engineering & Tech'
        : initialJob?.department === 'Infrastructure' || initialJob?.department === 'Quality'
          ? initialJob.department === 'Infrastructure'
            ? 'Engineering & Tech'
            : 'Quality Assurance'
          : recruiterJobCategories.find(
              (option) =>
                option === initialJob?.department ||
                option.toLowerCase().startsWith(`${initialJob?.department?.toLowerCase()} &`),
            ) || '';
  const compensationFrequency =
    initialJob?.compensation?.match(/\/\s*(mo|month|yr|year|week|hour|hr)\b/i)?.[1] || '';
  const selectedFrequency =
    compensationFrequency === 'mo' || compensationFrequency.toLowerCase() === 'month'
      ? 'per month'
      : compensationFrequency === 'yr' || compensationFrequency.toLowerCase() === 'year'
        ? 'per year'
        : compensationFrequency.toLowerCase() === 'week'
          ? 'per week'
          : initialJob?.compensation?.includes('/ yr') ||
              initialJob?.compensation?.includes('/year')
            ? 'per year'
            : 'per hour';
  const deadlineDate = initialJob?.deadline ? deadlineToInput(initialJob.deadline) : '';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const job: Partial<RecruiterJob> = {
      title: (data.get('title') as string) || '',
      company: (data.get('company') as string) || '',
      category: (data.get('category') as string) || '',
      department: (data.get('category') as string) || initialJob?.department,
      location: (data.get('location') as string) || '',
      type: jobType,
      compensation: (() => {
        const suffixes: Record<string, string> = {
          'per hour': ' / hr',
          'per day': ' / day',
          'per week': ' / week',
          'per month': ' / month',
          'per year': ' / yr',
        };
        return `${data.get('minSalary') || ''} - ${data.get('maxSalary') || ''}${suffixes[data.get('frequency') as string] || ' / hr'}`;
      })(),
      deadline: (data.get('deadline') as string) || '',
      remote,
      responsibility: (data.get('responsibility') as string) || '',
      qualifications: (data.get('qualifications') as string) || '',
    };

    const endpoint =
      mode === 'edit' && initialJob?.id
        ? `/api/recruiter/jobs/${initialJob.id}`
        : '/api/recruiter/jobs';
    const response = await fetch(endpoint, {
      method: mode === 'edit' ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job),
    });
    if (!response.ok) {
      toast.error(mode === 'edit' ? 'Job update failed' : 'Job publish failed');
      return;
    }
    setSaved(true);
    onSave?.(job);
    toast.success(mode === 'edit' ? 'Job updated successfully' : 'Job published successfully');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-white/4 bg-[#111827]/45 p-5 sm:p-6"
    >
      {saved && (
        <div className="mb-5 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-[12px] text-emerald-300">
          {mode === 'edit' ? 'Job updated successfully.' : 'Job published successfully.'}
        </div>
      )}
      <SectionTitle number="1" title="Basic Information" />
      <label className="mt-4 block">
        <span className="mb-2 block text-[11px] text-[#aab1c1]">Job Title *</span>
        <input
          name="title"
          required
          className={fields}
          defaultValue={initialJob?.title || ''}
          placeholder="Enter job title"
        />
      </label>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-[11px] text-[#aab1c1]">Company Name *</span>
          <input
            name="company"
            required
            className={fields}
            defaultValue={initialJob?.company || ''}
            placeholder="Enter company name"
          />
        </label>
        <label>
          <span className="mb-2 block text-[11px] text-[#aab1c1]">Job Category *</span>
          <select name="category" required className={fields} defaultValue={category}>
            <option value="" disabled>
              Select category
            </option>
            {recruiterJobCategories.map((jobCategory) => (
              <option key={jobCategory} value={jobCategory}>
                {jobCategory}
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className="mt-4 block text-[11px] text-[#aab1c1]">Job Type *</span>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {['Full-time', 'Part-time', 'Contract', 'Internship'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setJobType(type)}
            className={`h-10 rounded-md border text-[12px] ${jobType === type ? 'border-[#6258ff] bg-[#6258ff]/20 text-white' : 'border-[#252d43] text-[#9aa2b5]'}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="mt-7 border-t border-[#252d43] pt-6">
        <SectionTitle number="2" title="Location, Compensation & Timeline" />
        <button
          type="button"
          onClick={() => setRemote((value) => !value)}
          className="mt-4 flex w-full items-center justify-between rounded-md border border-[#252d43] px-4 py-3 text-left"
        >
          <span>
            <span className="block text-[12px] text-[#dfe3ec]">Remote Work Allowed (IsRemote)</span>
            <span className="mt-1 block text-[10px] text-[#81899d]">
              Enable remote work or distributed candidate applications
            </span>
          </span>
          <span
            className={`relative h-5 w-9 rounded-full transition ${remote ? 'bg-[#6258ff]' : 'bg-[#343b50]'}`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-white transition ${remote ? 'left-4.5' : 'left-0.5'}`}
            />
          </span>
        </button>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label>
            <span className="mb-2 block text-[11px] text-[#aab1c1]">Job Location (location)</span>
            <input
              name="location"
              className={fields}
              defaultValue={initialJob?.location?.replace('Remote (', '').replace(')', '') || ''}
              placeholder="New York, USA"
            />
          </label>
          <label>
            <span className="mb-2 block text-[11px] text-[#aab1c1]">
              Application Deadline (deadline)
            </span>
            <input
              name="deadline"
              type="date"
              className={`${fields} text-[#8f96aa]`}
              defaultValue={deadlineDate}
            />
          </label>
          <label>
            <span className="mb-2 block text-[11px] text-[#aab1c1]">Frequency</span>
            <select name="frequency" className={fields} defaultValue={selectedFrequency}>
              <option>per hour</option>
              <option>per day</option>
              <option>per week</option>
              <option>per month</option>
              <option>per year</option>
            </select>
          </label>
          <label>
            <span className="mb-2 block text-[11px] text-[#aab1c1]">Min Salary / Rate</span>
            <input name="minSalary" className={fields} defaultValue={minSalary} placeholder="$25" />
          </label>
          <label>
            <span className="mb-2 block text-[11px] text-[#aab1c1]">Max Salary / Rate</span>
            <input name="maxSalary" className={fields} defaultValue={maxSalary} placeholder="$40" />
          </label>
        </div>
      </div>

      <div className="mt-7 border-t border-[#252d43] pt-6">
        <SectionTitle number="3" title="Responsibilities & Requirements" />
        <label className="mt-4 block">
          <span className="mb-2 block text-[11px] text-[#aab1c1]">Key Responsibilities</span>
          <textarea
            name="responsibility"
            className={`${fields} h-20 resize-none py-3`}
            defaultValue={initialJob?.responsibility || ''}
            placeholder="Describe the key responsibilities"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-2 block text-[11px] text-[#aab1c1]">
            Qualifications & Requirements *
          </span>
          <textarea
            name="qualifications"
            required
            className={`${fields} h-24 resize-none py-3`}
            defaultValue={initialJob?.qualifications || ''}
            placeholder={
              '• Relevant experience\n• Required technical skills\n• Preferred qualifications'
            }
          />
        </label>
      </div>
      <button
        type="submit"
        className="mt-6 h-11 rounded-md bg-[#6258ff] px-6 text-[12px] font-semibold text-white"
      >
        {mode === 'edit' ? 'Update Job' : 'Publish Job'} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3 text-[13px] font-medium text-[#dfe3ed]">
      <span className="flex size-4.5 items-center justify-center rounded-full bg-[#6258ff] text-[9px] text-white">
        {number}
      </span>
      {title}
    </div>
  );
}
