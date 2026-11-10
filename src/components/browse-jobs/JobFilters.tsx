'use client';

export type JobFilterOption = {
  value: string;
  count: number;
};

type JobFiltersProps = {
  jobTypes: JobFilterOption[];
  selectedTypes: string[];
  onToggleType: (type: string) => void;
  workModes: JobFilterOption[];
  selectedWorkModes: string[];
  onToggleWorkMode: (mode: string) => void;
  locations: JobFilterOption[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  companies: JobFilterOption[];
  selectedCompany: string;
  onCompanyChange: (company: string) => void;
  departments: JobFilterOption[];
  selectedDepartment: string;
  onDepartmentChange: (department: string) => void;
  hasFilters: boolean;
  onClear: () => void;
};

const checkboxClassName =
  'size-3.5 rounded border-white/15 bg-[#1a1a1d] accent-[#695cff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8178ff]';

export default function JobFilters({
  jobTypes,
  selectedTypes,
  onToggleType,
  workModes,
  selectedWorkModes,
  onToggleWorkMode,
  locations,
  selectedLocation,
  onLocationChange,
  companies,
  selectedCompany,
  onCompanyChange,
  departments,
  selectedDepartment,
  onDepartmentChange,
  hasFilters,
  onClear,
}: JobFiltersProps) {
  const selectClassName =
    'h-9 w-full rounded-md border border-white/[0.07] bg-[#1a1a1d] px-2 text-xs text-[#d8d8df] outline-none focus:border-[#8178ff]';

  return (
    <aside className="h-fit rounded-xl border border-white/6 bg-[#141416] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-[#ededf3]">Filters</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-[#aaa2ff] transition hover:text-white"
          >
            Clear all
          </button>
        )}
      </div>

      <fieldset className="mt-5">
        <legend className="mb-3 text-xs font-medium text-[#d8d8df]">Job Type</legend>
        {jobTypes.length > 0 ? (
          <div className="space-y-2.5">
            {jobTypes.map(({ value, count }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2.5 text-xs text-[#a2a2ab]"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(value)}
                  onChange={() => onToggleType(value)}
                  className={checkboxClassName}
                />
                <span className="flex-1">{value}</span>
                <span className="text-[10px] text-[#74747d]">{count}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#777780]">No job types available</p>
        )}
      </fieldset>

      {workModes.length > 0 && (
        <fieldset className="mt-5 border-t border-white/6 pt-4">
        <legend className="mb-3 text-xs font-medium text-[#d8d8df]">Work Arrangement</legend>
          <div className="space-y-2.5">
            {workModes.map(({ value, count }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2.5 text-xs text-[#a2a2ab]"
              >
                <input
                  type="checkbox"
                  checked={selectedWorkModes.includes(value)}
                  onChange={() => onToggleWorkMode(value)}
                  className={checkboxClassName}
                />
                <span className="flex-1">{value}</span>
                <span className="text-[10px] text-[#74747d]">{count}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {locations.length > 0 && (
        <div className="mt-5 border-t border-white/6 pt-4">
          <label
            htmlFor="browse-jobs-location"
            className="mb-2 block text-xs font-medium text-[#d8d8df]"
          >
            Location
          </label>
          <select
            id="browse-jobs-location"
            value={selectedLocation}
            onChange={(event) => onLocationChange(event.target.value)}
            className={selectClassName}
          >
            <option value="">All locations</option>
            {locations.map(({ value, count }) => (
              <option key={value} value={value}>
                {value} ({count})
              </option>
            ))}
          </select>
        </div>
      )}

      {companies.length > 0 && (
        <SelectFilter
          id="browse-jobs-company"
          label="Company"
          placeholder="All companies"
          options={companies}
          value={selectedCompany}
          onChange={onCompanyChange}
          className={selectClassName}
        />
      )}

      {departments.length > 0 && (
        <SelectFilter
          id="browse-jobs-department"
          label="Department"
          placeholder="All departments"
          options={departments}
          value={selectedDepartment}
          onChange={onDepartmentChange}
          className={selectClassName}
        />
      )}
    </aside>
  );
}

function SelectFilter({
  id,
  label,
  placeholder,
  options,
  value,
  onChange,
  className,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: JobFilterOption[];
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return (
    <div className="mt-5 border-t border-white/6 pt-4">
      <label htmlFor={id} className="mb-2 block text-xs font-medium text-[#d8d8df]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        <option value="">{placeholder}</option>
        {options.map(({ value: option, count }) => (
          <option key={option} value={option}>
            {option} ({count})
          </option>
        ))}
      </select>
    </div>
  );
}
