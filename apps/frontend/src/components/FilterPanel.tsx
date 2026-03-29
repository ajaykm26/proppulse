import { useState } from 'react';

export interface FilterValues {
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  minBathrooms: string;
  propertyType: string;
  status: string;
}

export const EMPTY_FILTERS: FilterValues = {
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  minBathrooms: '',
  propertyType: '',
  status: '',
};

interface FilterPanelProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: () => void;
}

const PROPERTY_TYPES = [
  { value: '', label: 'Any type' },
  { value: 'house', label: 'House' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'multi-family', label: 'Multi-family' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'off-market', label: 'Off Market' },
];

/** Returns true when any filter value is set */
export function hasActiveFilters(f: FilterValues): boolean {
  return Object.values(f).some(Boolean);
}

export function FilterPanel({ values, onChange, onApply }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const active = hasActiveFilters(values);

  function set(key: keyof FilterValues, value: string) {
    onChange({ ...values, [key]: value });
  }

  function clearAll() {
    onChange({ ...EMPTY_FILTERS });
    onApply();
  }

  const inputClass =
    'w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white';

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* Funnel icon */}
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            />
          </svg>
          Filters
          {active && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-xs bg-primary-600 text-white rounded-full leading-none">
              ✓
            </span>
          )}
          {/* Chevron */}
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {active && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Price ($)</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={values.minPrice}
                onChange={(e) => set('minPrice', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Max Price ($)</label>
              <input
                type="number"
                min={0}
                placeholder="Any"
                value={values.maxPrice}
                onChange={(e) => set('maxPrice', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Beds</label>
              <input
                type="number"
                min={0}
                placeholder="Any"
                value={values.minBedrooms}
                onChange={(e) => set('minBedrooms', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Min Baths</label>
              <input
                type="number"
                min={0}
                step="0.5"
                placeholder="Any"
                value={values.minBathrooms}
                onChange={(e) => set('minBathrooms', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={values.propertyType}
                onChange={(e) => set('propertyType', e.target.value)}
                className={inputClass}
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={values.status}
                onChange={(e) => set('status', e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onApply}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
