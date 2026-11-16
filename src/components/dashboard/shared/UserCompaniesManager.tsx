'use client';

import {
  isManagedCompany,
  isManagedCompanyDetails,
  isManagedCompanyList,
  isRecord,
  type ManagedCompany,
  type ManagedCompanyDetails,
  type ManagedCompanyList,
} from '@/lib/company-contract';
import { formatDisplayDate } from '@/lib/date-format';
import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Globe2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { toast } from 'sonner';
import DashboardAvatar from './DashboardAvatar';

const pageSize = 10;
const allowedLogoTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const maximumLogoBytes = 1024 * 1024;

type ModalState =
  | { type: 'form'; company: ManagedCompany | null }
  | { type: 'details'; companyId: string }
  | null;

function getErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === 'string' ? value.error : fallback;
}

function getCompanyLogo(company: ManagedCompany) {
  return (
    company.logo ||
    (company.hasLogo ? `/api/companies/${encodeURIComponent(company.id)}/logo` : null)
  );
}

function getJobStatusStyle(status: string | null) {
  if (status?.toLowerCase() === 'active') return 'bg-emerald-400/10 text-emerald-300';
  if (status?.toLowerCase() === 'closed') return 'bg-white/[0.06] text-[#aaaab3]';
  return 'bg-[#8d68ff]/10 text-[#c2aaff]';
}

function CompanyForm({
  company,
  onCancel,
  onSaved,
}: {
  company: ManagedCompany | null;
  onCancel: () => void;
  onSaved: (savedCompany: ManagedCompany, duplicate: boolean) => void;
}) {
  const [name, setName] = useState(company?.name || '');
  const [industry, setIndustry] = useState(company?.industry || '');
  const [location, setLocation] = useState(company?.location || '');
  const [website, setWebsite] = useState(company?.website || '');
  const [description, setDescription] = useState(company?.description || '');
  const [logo, setLogo] = useState(company?.logo || '');
  const [logoTouched, setLogoTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleLogoFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!allowedLogoTypes.has(file.type)) {
      toast.error('Logo must be a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > maximumLogoBytes) {
      toast.error('Logo image must be 1 MB or smaller.');
      event.target.value = '';
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the logo image.'));
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Could not read the logo image.'));
            return;
          }
          resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
      setLogo(dataUrl);
      setLogoTouched(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the logo image.');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const payload: Record<string, unknown> = {
      name: name.trim(),
      industry: industry.trim(),
      location: location.trim(),
      website: website.trim(),
      description: description.trim(),
    };
    if (logoTouched) payload.logo = logo.trim();

    setSaving(true);
    try {
      const response = await fetch(
        company ? `/api/companies/${encodeURIComponent(company.id)}` : '/api/companies',
        {
          method: company ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            result,
            company ? 'Could not update company.' : 'Could not create company.',
          ),
        );
      }

      const savedCompany =
        isRecord(result) && isManagedCompany(result.company) ? result.company : null;
      if (!savedCompany) throw new Error('The company service returned invalid data.');
      const duplicate = isRecord(result) && result.duplicate === true;
      toast.success(
        duplicate
          ? 'You already submitted this company. You can edit the saved details now.'
          : company
            ? 'Company updated successfully.'
            : 'Company submitted successfully.',
      );
      onSaved(savedCompany, duplicate);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save company details.');
    } finally {
      setSaving(false);
    }
  }

  const previewLogo = logo || (company?.hasLogo ? getCompanyLogo(company) : null);

  return (
    <form onSubmit={handleSubmit} className="mt-5 space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-[#c7c9d4]">Company name *</span>
        <input
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Northstar Labs"
          className="h-10 w-full rounded-lg border border-white/9 bg-[#0e111a] px-3 text-xs text-[#f1f3f8] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/70"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-[#c7c9d4]">Industry</span>
          <input
            maxLength={120}
            value={industry}
            onChange={(event) => setIndustry(event.target.value)}
            placeholder="Technology"
            className="h-10 w-full rounded-lg border border-white/9 bg-[#0e111a] px-3 text-xs text-[#f1f3f8] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/70"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-[#c7c9d4]">Location</span>
          <input
            maxLength={160}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Dhaka, Bangladesh"
            className="h-10 w-full rounded-lg border border-white/9 bg-[#0e111a] px-3 text-xs text-[#f1f3f8] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/70"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-[#c7c9d4]">Website</span>
        <span className="relative block">
          <Globe2
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#737b91]"
          />
          <input
            type="url"
            maxLength={500}
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            placeholder="https://example.com"
            className="h-10 w-full rounded-lg border border-white/9 bg-[#0e111a] pl-9 pr-3 text-xs text-[#f1f3f8] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/70"
          />
        </span>
      </label>

      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-[#c7c9d4]">Company logo</span>
        <div className="flex items-center gap-3">
          <DashboardAvatar src={previewLogo} name={name} size="md" />
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="sr-only">Logo image URL</span>
              <input
                type="url"
                maxLength={500}
                value={logo.startsWith('data:') ? '' : logo}
                onChange={(event) => {
                  setLogo(event.target.value);
                  setLogoTouched(true);
                }}
                placeholder="Paste a logo URL"
                className="h-9 w-full rounded-lg border border-white/9 bg-[#0e111a] px-3 text-[11px] text-[#f1f3f8] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/70"
              />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="rounded-md border border-white/9 px-2.5 py-1.5 text-[10px] text-[#d9dce6] transition hover:bg-white/5"
                hidden={company?.id.startsWith('legacy_')}
              >
                Upload image
              </button>
              {(logo || (company?.hasLogo && !logoTouched)) && (
                <button
                  type="button"
                  onClick={() => {
                    setLogo('');
                    setLogoTouched(true);
                    if (fileInput.current) fileInput.current.value = '';
                  }}
                  className="px-1 text-[10px] text-[#a3a8b8] transition hover:text-rose-300"
                >
                  Remove logo
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void handleLogoFile(event)}
                className="sr-only"
                disabled={company?.id.startsWith('legacy_')}
              />
            </div>
          </div>
        </div>
        <p className="mt-2 text-[9px] text-[#788096]">
          {company?.id.startsWith('legacy_')
            ? 'Existing recruiter profiles use a logo URL.'
            : 'PNG, JPEG or WebP · maximum 1 MB'}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium text-[#c7c9d4]">Description</span>
        <textarea
          maxLength={2000}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Tell people what your company does."
          className="w-full resize-y rounded-lg border border-white/9 bg-[#0e111a] px-3 py-2.5 text-xs leading-5 text-[#f1f3f8] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/70"
        />
      </label>

      <div className="flex justify-end gap-2 border-t border-white/[0.07] pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-9 rounded-lg border border-white/9 px-3.5 text-[11px] text-[#c5c8d3] transition hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#7162ff] px-4 text-[11px] font-semibold text-white transition hover:bg-[#8174ff] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            'Saving…'
          ) : (
            <>
              <Check aria-hidden="true" className="size-3.5" />
              {company ? 'Save changes' : 'Submit company'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function UserCompaniesManager() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [listState, setListState] = useState<{ key: string; data: ManagedCompanyList } | null>(
    null,
  );
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [detailState, setDetailState] = useState<{
    id: string;
    data: ManagedCompanyDetails;
  } | null>(null);
  const [detailError, setDetailError] = useState<{ id: string; message: string } | null>(null);
  const [detailsRetry, setDetailsRetry] = useState(0);
  const formDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);

  const listKey = [page, search, refreshVersion].join('|');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch !== search) {
        setSearch(nextSearch);
        setPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.set('search', search);

    async function loadCompanies() {
      try {
        const response = await fetch(`/api/companies?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, 'Could not load companies.'));
        if (!isManagedCompanyList(payload))
          throw new Error('The company service returned invalid data.');
        if (page > Math.max(1, payload.pagination.totalPages)) {
          setPage(Math.max(1, payload.pagination.totalPages));
          return;
        }
        setListState({ key: listKey, data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Could not load companies.';
        setListError({
          key: listKey,
          message,
        });
        toast.error(message);
      }
    }
    void loadCompanies();
    return () => controller.abort();
  }, [listKey, page, search]);

  useEffect(() => {
    const dialog = formDialog.current;
    if (!dialog) return;
    if (modal?.type === 'form' && !dialog.open) dialog.showModal();
    if (modal?.type !== 'form' && dialog.open) dialog.close();
  }, [modal]);

  useEffect(() => {
    const dialog = detailDialog.current;
    if (!dialog) return;
    if (modal?.type === 'details' && !dialog.open) dialog.showModal();
    if (modal?.type !== 'details' && dialog.open) dialog.close();
  }, [modal]);

  useEffect(() => {
    if (modal?.type !== 'details') return;
    const companyId = modal.companyId;
    const controller = new AbortController();
    async function loadCompany() {
      try {
        const response = await fetch(`/api/companies/${encodeURIComponent(companyId)}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok)
          throw new Error(getErrorMessage(payload, 'Could not load company details.'));
        if (!isManagedCompanyDetails(payload)) {
          throw new Error('The company service returned invalid details.');
        }
        setDetailState({ id: companyId, data: payload });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : 'Could not load company details.';
        setDetailError({
          id: companyId,
          message,
        });
        toast.error(message);
      }
    }
    void loadCompany();
    return () => controller.abort();
  }, [detailsRetry, modal]);

  const listData = listState?.key === listKey ? listState.data : null;
  const currentListError = listError?.key === listKey ? listError.message : null;
  const listLoading = !listData && !currentListError;
  const activeDetails =
    modal?.type === 'details' && detailState?.id === modal.companyId ? detailState.data : null;
  const activeDetailError =
    modal?.type === 'details' && detailError?.id === modal.companyId ? detailError.message : null;
  const visibleDetail =
    activeDetails?.company ??
    (modal?.type === 'details'
      ? (listData?.companies.find((company) => company.id === modal.companyId) ?? null)
      : null);

  function openForm(company: ManagedCompany | null) {
    setModal({ type: 'form', company });
  }

  function openDetails(company: ManagedCompany) {
    setDetailError(null);
    setModal({ type: 'details', companyId: company.id });
  }

  function handleSaved(savedCompany: ManagedCompany, duplicate: boolean) {
    setPage(1);
    setRefreshVersion((version) => version + 1);
    if (duplicate) {
      setModal({ type: 'form', company: savedCompany });
      return;
    }
    setModal(null);
    setSearchInput('');
    setSearch('');
  }

  function closeModal() {
    setModal(null);
  }

  const firstItem = listData?.pagination.total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = listData ? Math.min(page * pageSize, listData.pagination.total) : 0;
  const totalPages = Math.max(1, listData?.pagination.totalPages || 1);

  return (
    <div className="mx-auto w-full max-w-330 py-5 lg:py-7">
      <div className="mb-5 text-[11px] text-[#858da1]">
        Dashboard <span className="px-1.5 text-[#4f5668]">/</span> Companies
      </div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#f1f3f8] sm:text-2xl">
            My Companies
          </h1>
          <p className="mt-1 max-w-xl text-[11px] leading-5 text-[#9299ad]">
            Submit company details and manage only the companies you created.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm(null)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#7162ff] px-4 text-[11px] font-semibold text-white transition hover:bg-[#8174ff]"
        >
          <Plus aria-hidden="true" className="size-4" />
          Add company
        </button>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#111827]/45">
        <div className="flex flex-col gap-3 border-b border-white/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#788096]"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              maxLength={120}
              placeholder="Search your companies"
              className="h-9 w-full rounded-lg border border-white/8 bg-[#0e111a] pl-9 pr-3 text-[11px] text-[#e7eaf2] outline-none placeholder:text-[#697185] focus:border-[#8d68ff]/60"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] text-[#9299ad]">
            <Building2 aria-hidden="true" className="size-3.5 text-[#a99aff]" />
            {listData
              ? `${listData.pagination.total.toLocaleString()} companies`
              : 'Your companies'}
          </span>
        </div>

        {listLoading ? (
          <div aria-label="Loading companies" className="space-y-3 p-4">
            <div className="h-20 animate-pulse rounded-lg bg-white/[0.035]" />
            <div className="h-20 animate-pulse rounded-lg bg-white/[0.035]" />
          </div>
        ) : currentListError ? (
          <div className="flex min-h-56 flex-col items-center justify-center px-5 text-center">
            <p role="alert" className="max-w-md text-xs text-rose-200">
              {currentListError}
            </p>
            <button
              type="button"
              onClick={() => setRefreshVersion((version) => version + 1)}
              className="mt-3 rounded-lg border border-white/9 px-3 py-2 text-[10px] text-[#d9dce6] transition hover:bg-white/5"
            >
              Try again
            </button>
          </div>
        ) : listData?.companies.length ? (
          <div className="divide-y divide-white/6">
            {listData.companies.map((company) => (
              <article
                key={company.id}
                className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <DashboardAvatar src={getCompanyLogo(company)} name={company.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => openDetails(company)}
                      className="max-w-full truncate text-left text-xs font-semibold text-[#edf0f7] transition hover:text-[#c2b9ff]"
                    >
                      {company.name}
                    </button>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#858da1]">
                      {company.industry && <span>{company.industry}</span>}
                      {company.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin aria-hidden="true" className="size-3" />
                          {company.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays aria-hidden="true" className="size-3" />
                        Added {formatDisplayDate(company.createdAt)}
                      </span>
                    </div>
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-[10px] text-[#b4a9ff] hover:text-white"
                      >
                        <span className="truncate">{company.website}</span>
                        <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => openDetails(company)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/9 px-3 text-[10px] font-medium text-[#c9ccda] transition hover:bg-white/5 hover:text-white"
                  >
                    Details
                    <ArrowUpRight aria-hidden="true" className="size-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openForm(company)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#8d68ff]/25 bg-[#8d68ff]/10 px-3 text-[10px] font-medium text-[#c6b5ff] transition hover:bg-[#8d68ff]/20"
                  >
                    <Pencil aria-hidden="true" className="size-3" />
                    Edit
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-[#8d68ff]/10 text-[#b8a2ff]">
              <Building2 aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-3 text-sm font-medium text-[#e6e9f1]">
              {search ? 'No matching companies' : 'No companies yet'}
            </h2>
            <p className="mt-1 max-w-sm text-[10px] leading-5 text-[#858da1]">
              {search
                ? 'Try another search term or clear your search.'
                : 'Add a company to keep its details in one place. Existing company and job records are not changed.'}
            </p>
            {!search && (
              <button
                type="button"
                onClick={() => openForm(null)}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[#7162ff] px-3.5 text-[10px] font-semibold text-white transition hover:bg-[#8174ff]"
              >
                <Plus aria-hidden="true" className="size-3.5" />
                Add your first company
              </button>
            )}
          </div>
        )}

        {listData && listData.pagination.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[#858da1]">
              Showing {firstItem}–{lastItem} of {listData.pagination.total.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                aria-label="Previous page"
                className="flex size-8 items-center justify-center rounded-lg border border-white/8 text-[#b8bdcc] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>
              <span className="min-w-20 text-center text-[10px] text-[#a8adbd]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                aria-label="Next page"
                className="flex size-8 items-center justify-center rounded-lg border border-white/8 text-[#b8bdcc] transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      <dialog
        ref={formDialog}
        aria-modal="true"
        aria-labelledby="company-form-title"
        className="m-auto max-h-[92vh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#171c2a] p-5 text-[#e7eaf2] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:p-6"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        {modal?.type === 'form' && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a99aff]">
                  Company profile
                </p>
                <h2 id="company-form-title" className="mt-1 text-base font-semibold text-[#f1f3f8]">
                  {modal.company ? 'Edit company' : 'Add a company'}
                </h2>
                <p className="mt-1 text-[10px] leading-4 text-[#8991a5]">
                  Your account owns this submission. Other users cannot edit it.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close company form"
                onClick={closeModal}
                className="rounded-lg p-2 text-[#8991a5] transition hover:bg-white/6 hover:text-white"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <CompanyForm
              key={modal.company?.id || 'new-company'}
              company={modal.company}
              onCancel={closeModal}
              onSaved={handleSaved}
            />
          </>
        )}
      </dialog>

      <dialog
        ref={detailDialog}
        aria-modal="true"
        aria-labelledby="company-details-title"
        className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#171c2a] p-5 text-[#e7eaf2] shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:p-6"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        {visibleDetail && modal?.type === 'details' && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <DashboardAvatar
                  src={getCompanyLogo(visibleDetail)}
                  name={visibleDetail.name}
                  size="lg"
                />
                <div className="min-w-0">
                  <h2
                    id="company-details-title"
                    className="truncate text-base font-semibold text-[#f1f3f8]"
                  >
                    {visibleDetail.name}
                  </h2>
                  <p className="mt-1 text-[10px] text-[#8991a5]">
                    Company information and related jobs
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close company details"
                onClick={closeModal}
                className="rounded-lg p-2 text-[#8991a5] transition hover:bg-white/6 hover:text-white"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            {activeDetailError ? (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-rose-400/15 bg-rose-400/4 p-3 text-xs text-rose-200"
              >
                {activeDetailError}
                <button
                  type="button"
                  onClick={() => {
                    setDetailError(null);
                    setDetailsRetry((version) => version + 1);
                  }}
                  className="ml-3 text-[10px] font-medium text-[#d0c1ff] hover:text-white"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.07] bg-white/2.5 p-3.5">
                    <div className="flex items-center gap-2 text-[10px] text-[#8991a5]">
                      <Users aria-hidden="true" className="size-3.5" />
                      Company details
                    </div>
                    <p className="mt-2 text-xs font-medium text-[#e5e8f0]">
                      {visibleDetail.industry || 'Industry not provided'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[#8991a5]">
                      <MapPin aria-hidden="true" className="size-3" />
                      {visibleDetail.location || 'Location not provided'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/2.5 p-3.5">
                    <div className="flex items-center gap-2 text-[10px] text-[#8991a5]">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      Submitted
                    </div>
                    <p className="mt-2 text-xs text-[#e5e8f0]">
                      {formatDisplayDate(visibleDetail.createdAt)}
                    </p>
                    <p className="mt-1 text-[10px] text-[#8991a5]">
                      {visibleDetail.jobCount === undefined
                        ? 'Related jobs loading'
                        : `${visibleDetail.jobCount} related job${visibleDetail.jobCount === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
                {visibleDetail.website && (
                  <a
                    href={visibleDetail.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex max-w-full items-center gap-1.5 text-[11px] text-[#b4a9ff] hover:text-white"
                  >
                    <span className="truncate">{visibleDetail.website}</span>
                    <ExternalLink aria-hidden="true" className="size-3 shrink-0" />
                  </a>
                )}
                <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/2.5 p-3.5">
                  <p className="text-[10px] text-[#8991a5]">Description</p>
                  <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-[#c7cbd7]">
                    {visibleDetail.description || 'No description provided.'}
                  </p>
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold text-[#e5e8f0]">Related job posts</h3>
                    {activeDetails && <span className="text-[10px] text-[#8991a5]">Latest 20</span>}
                  </div>
                  {activeDetails ? (
                    activeDetails.jobs.length ? (
                      <ul className="space-y-2">
                        {activeDetails.jobs.map((job) => (
                          <li
                            key={job.id}
                            className="flex flex-col gap-2 rounded-lg border border-white/6 bg-[#10141f] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-medium text-[#e5e8f0]">
                                {job.title}
                              </p>
                              <p className="mt-1 truncate text-[10px] text-[#8991a5]">
                                {job.location || 'Location not provided'} ·{' '}
                                {formatDisplayDate(job.createdAt)}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-2 py-1 text-[9px] ${getJobStatusStyle(job.status)}`}
                            >
                              {job.status || 'Unknown'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-lg border border-white/6 bg-[#10141f] px-3 py-4 text-center text-[10px] text-[#8991a5]">
                        No related job posts.
                      </p>
                    )
                  ) : (
                    <div aria-label="Loading related jobs" className="animate-pulse space-y-2">
                      <div className="h-12 rounded-lg bg-white/4" />
                      <div className="h-12 rounded-lg bg-white/4" />
                    </div>
                  )}
                </div>
                <div className="mt-5 flex justify-end border-t border-white/[0.07] pt-4">
                  <button
                    type="button"
                    onClick={() => openForm(visibleDetail)}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#8d68ff]/25 bg-[#8d68ff]/10 px-3.5 text-[10px] font-semibold text-[#d0c2ff] transition hover:bg-[#8d68ff]/20"
                  >
                    <Pencil aria-hidden="true" className="size-3" />
                    Edit company
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
