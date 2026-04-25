import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { SearchBar } from '../components/SearchBar';
import { PropertyCard } from '../components/PropertyCard';
import { FilterPanel, hasActiveFilters } from '../components/FilterPanel';
import { Pagination } from '../components/Pagination';
import { SearchInsights } from '../components/SearchInsights';
import type { FilterValues } from '../components/FilterPanel';
import type {
  ApiResponse,
  CreateSavedPropertyInput,
  CreateSavedSearchInput,
  SavedProperty,
  SearchResult,
  SearchQuery,
  PropertyType,
  PropertyStatus,
  SavedSearch,
  SortOption,
  UpdateSavedSearchInput,
} from '@proppulse/shared';

function parseQuery(q: string): Partial<SearchQuery> {
  const trimmed = q.trim();
  if (!trimmed) return {};

  const zipMatch = trimmed.match(/\b(\d{5})\b/);
  const zipCode = zipMatch?.[1];
  const withoutZip = trimmed.replace(/\b\d{5}\b/, '').trim().replace(/,\s*$/, '').trim();

  const cityStateMatch = withoutZip.match(/^(.+?),?\s+([A-Z]{2})$/i);
  if (cityStateMatch) {
    return {
      city: cityStateMatch[1].trim(),
      state: cityStateMatch[2].toUpperCase(),
      ...(zipCode && { zipCode }),
      query: trimmed,
    };
  }

  if (/^[a-z\s]+$/i.test(withoutZip) && withoutZip.split(' ').length <= 3) {
    return { city: withoutZip, ...(zipCode && { zipCode }), query: trimmed };
  }

  return { query: trimmed };
}

function paramsToFilters(p: URLSearchParams): FilterValues {
  return {
    minPrice: p.get('minPrice') ?? '',
    maxPrice: p.get('maxPrice') ?? '',
    minBedrooms: p.get('minBeds') ?? '',
    minBathrooms: p.get('minBaths') ?? '',
    propertyType: p.get('type') ?? '',
    status: p.get('status') ?? '',
  };
}

function buildParams(
  q: string,
  f: FilterValues,
  page?: number,
  sort?: SortOption,
  savedSearchId?: string,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (f.minPrice) params.minPrice = f.minPrice;
  if (f.maxPrice) params.maxPrice = f.maxPrice;
  if (f.minBedrooms) params.minBeds = f.minBedrooms;
  if (f.minBathrooms) params.minBaths = f.minBathrooms;
  if (f.propertyType) params.type = f.propertyType;
  if (f.status) params.status = f.status;
  if (page && page > 1) params.page = String(page);
  if (sort && sort !== 'best-match') params.sort = sort;
  if (savedSearchId) params.savedSearchId = savedSearchId;
  return params;
}

function filtersToSearchQuery(q: string, page: number, f: FilterValues, sort?: SortOption): SearchQuery {
  return {
    ...parseQuery(q),
    ...(f.minPrice && { minPriceCents: Math.round(parseFloat(f.minPrice) * 100) }),
    ...(f.maxPrice && { maxPriceCents: Math.round(parseFloat(f.maxPrice) * 100) }),
    ...(f.minBedrooms && { minBedrooms: parseInt(f.minBedrooms, 10) }),
    ...(f.minBathrooms && { minBathrooms: parseFloat(f.minBathrooms) }),
    ...(f.propertyType && { propertyType: f.propertyType as PropertyType }),
    ...(f.status && { status: f.status as PropertyStatus }),
    page,
    limit: 20,
    ...(sort && sort !== 'best-match' && { sort }),
  };
}

function buildSavedSearchName(q: string, f: FilterValues): string {
  const parts: string[] = [];
  if (q.trim()) parts.push(q.trim());
  if (f.propertyType) parts.push(f.propertyType);
  if (f.status) parts.push(f.status);
  if (f.minBedrooms) parts.push(`${f.minBedrooms}+ bd`);
  if (f.maxPrice) parts.push(`under $${Number(f.maxPrice).toLocaleString()}`);
  return parts.slice(0, 4).join(' • ') || 'Saved search';
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();

  const [filters, setFilters] = useState<FilterValues>(() => paramsToFilters(searchParams));
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{ loading: boolean; message: string | null; error: string | null }>({
    loading: false,
    message: null,
    error: null,
  });
  const [activeSavedSearch, setActiveSavedSearch] = useState<SavedSearch | null>(null);

  // propertyId → savedPropertyId (for the heart toggle on each card)
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map());

  // Load saved property IDs once so cards can show the heart toggle
  useEffect(() => {
    if (!isSignedIn) {
      setSavedMap(new Map());
      return;
    }

    async function loadSavedProperties() {
      try {
        const token = await getToken();
        const res = await fetch('/api/saved-properties', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = (await res.json()) as ApiResponse<SavedProperty[]>;
        if (data.success && data.data) {
          setSavedMap(new Map(data.data.map((sp) => [sp.propertyId, sp.id])));
        }
      } catch {
        // non-critical — heart state simply won't show
      }
    }

    void loadSavedProperties();
  }, [isSignedIn, getToken]);

  async function handleToggleSave(propertyId: string, savedPropertyId: string | null) {
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      if (savedPropertyId) {
        // Unsave: optimistic remove, then API call
        setSavedMap((prev) => {
          const next = new Map(prev);
          next.delete(propertyId);
          return next;
        });
        await fetch(`/api/saved-properties/${savedPropertyId}`, { method: 'DELETE', headers });
      } else {
        // Save: API call then store returned id
        const payload: CreateSavedPropertyInput = { propertyId };
        const res = await fetch('/api/saved-properties', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as ApiResponse<SavedProperty>;
        if (data.success && data.data) {
          setSavedMap((prev) => new Map(prev).set(propertyId, data.data!.id));
        }
      }
    } catch {
      // revert optimistic update by re-fetching on next render is acceptable for MVP
    }
  }

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const f = paramsToFilters(searchParams);
    const sort = (searchParams.get('sort') as SortOption | null) ?? undefined;

    setFilters(f);

    const hasInput = !!q || hasActiveFilters(f);
    if (hasInput) {
      void runSearch(q, page, f, sort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const savedSearchId = searchParams.get('savedSearchId');

    if (!isSignedIn || !savedSearchId) {
      setActiveSavedSearch(null);
      return;
    }

    async function loadSavedSearch() {
      try {
        const token = await getToken();
        const res = await fetch('/api/saved-searches', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = (await res.json()) as ApiResponse<SavedSearch[]>;
        if (data.success && data.data) {
          setActiveSavedSearch(data.data.find((item) => item.id === savedSearchId) ?? null);
        } else {
          setActiveSavedSearch(null);
        }
      } catch {
        setActiveSavedSearch(null);
      }
    }

    void loadSavedSearch();
  }, [getToken, isSignedIn, searchParams]);

  async function runSearch(q: string, page: number, f: FilterValues, sort?: SortOption) {
    setIsLoading(true);
    setError(null);
    try {
      const body = filtersToSearchQuery(q, page, f, sort);
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = (await res.json()) as SearchResult;
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleSearch(newQ: string) {
    const sort = (searchParams.get('sort') as SortOption | null) ?? undefined;
    const savedSearchId = activeSavedSearch?.id ?? undefined;
    setSearchParams(buildParams(newQ, filters, undefined, sort, savedSearchId));
  }

  function handleApplyFilters(nextFilters?: FilterValues) {
    const q = searchParams.get('q') ?? '';
    const sort = (searchParams.get('sort') as SortOption | null) ?? undefined;
    const savedSearchId = activeSavedSearch?.id ?? undefined;
    setSearchParams(buildParams(q, nextFilters ?? filters, undefined, sort, savedSearchId));
  }

  function handlePageChange(newPage: number) {
    const q = searchParams.get('q') ?? '';
    const f = paramsToFilters(searchParams);
    const sort = (searchParams.get('sort') as SortOption | null) ?? undefined;
    const savedSearchId = activeSavedSearch?.id ?? undefined;
    setSearchParams(buildParams(q, f, newPage, sort, savedSearchId));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSortChange(newSort: SortOption) {
    const q = searchParams.get('q') ?? '';
    const f = paramsToFilters(searchParams);
    const savedSearchId = activeSavedSearch?.id ?? undefined;
    setSearchParams(buildParams(q, f, 1, newSort, savedSearchId));
  }

  async function handleSaveSearch() {
    const q = searchParams.get('q') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const sort = (searchParams.get('sort') as SortOption | null) ?? undefined;
    const query = filtersToSearchQuery(q, page, filters, sort);
    const defaultName = buildSavedSearchName(q, filters);

    setSaveState({ loading: true, message: null, error: null });

    try {
      const token = await getToken();
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      if (activeSavedSearch) {
        const payload: UpdateSavedSearchInput = {
          name: activeSavedSearch.name || defaultName,
          query,
        };
        const res = await fetch(`/api/saved-searches/${activeSavedSearch.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });

        const data = (await res.json()) as ApiResponse<SavedSearch>;
        if (!res.ok || !data.success || !data.data) {
          throw new Error(data.error ?? 'Failed to update saved search');
        }

        setActiveSavedSearch(data.data);
        setSaveState({ loading: false, message: `Updated “${data.data.name}”`, error: null });
        return;
      }

      const payload: CreateSavedSearchInput = {
        name: defaultName,
        query,
      };

      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiResponse<SavedSearch>;
      if (!res.ok || !data.success || !data.data) {
        throw new Error(data.error ?? 'Failed to save search');
      }

      setActiveSavedSearch(data.data);
      setSearchParams(buildParams(q, filters, page, sort, data.data.id));
      setSaveState({ loading: false, message: `Saved as “${data.data.name}”`, error: null });
    } catch (err) {
      setSaveState({
        loading: false,
        message: null,
        error: err instanceof Error ? err.message : 'Failed to save search',
      });
    }
  }

  const q = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'best-match';
  const activeFilters = paramsToFilters(searchParams);
  const hasInput = !!q || hasActiveFilters(activeFilters);
  const saveButtonLabel = useMemo(() => {
    if (saveState.loading) return activeSavedSearch ? 'Updating…' : 'Saving…';
    return activeSavedSearch ? 'Update saved search' : 'Save search';
  }, [activeSavedSearch, saveState.loading]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find your next home</h1>
          <p className="text-sm text-gray-500 mt-1">
            Search listings, apply filters, and save promising criteria for later.
            {activeSavedSearch ? ` Editing “${activeSavedSearch.name}”.` : ''}
          </p>
        </div>

        <div className="sm:text-right">
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => void handleSaveSearch()}
              disabled={!hasInput || saveState.loading}
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveButtonLabel}
            </button>
          ) : (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Sign in to save searches
            </Link>
          )}

          {saveState.message && <p className="mt-2 text-xs text-green-600">{saveState.message}</p>}
          {saveState.error && <p className="mt-2 text-xs text-red-600">{saveState.error}</p>}
        </div>
      </div>

      <div className="mb-4">
        <SearchBar onSearch={handleSearch} initialValue={q} />
      </div>

      <FilterPanel values={filters} onChange={setFilters} onApply={handleApplyFilters} />

      {!isLoading && !error && hasInput && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Current search: <span className="font-medium text-gray-900">{buildSavedSearchName(q, activeFilters)}</span>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col items-center py-16 text-gray-500 gap-4">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p>Searching properties...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-1">
            Make sure the backend is running: <code className="bg-red-100 px-1 rounded">npm run dev:backend</code>
          </p>
        </div>
      )}

      {!isLoading && !error && results !== null && results.total === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏚️</div>
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">
            Try broadening your filters or a different search —{' '}
            <button className="text-primary-600 hover:underline" onClick={() => handleSearch('Edison, NJ')}>
              Edison, NJ
            </button>{' '}
            or{' '}
            <button className="text-primary-600 hover:underline" onClick={() => handleSearch('Jersey City')}>
              Jersey City
            </button>
          </p>
        </div>
      )}

      {!isLoading && !error && results === null && !hasInput && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏠</div>
          <p>Enter a search above to find properties</p>
          <p className="text-sm mt-2 text-gray-300">Try "Edison, NJ" · "Jersey City" · "New York, NY"</p>
        </div>
      )}

      {!isLoading && !error && results !== null && results.total > 0 && (
        <>
          <SearchInsights properties={results.properties} total={results.total} />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {results.total} {results.total === 1 ? 'property' : 'properties'} found
              {results.totalPages > 1 && ` · page ${results.page} of ${results.totalPages}`}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-gray-500 whitespace-nowrap">
                Sort by
              </label>
              <select
                id="sort-select"
                value={sort}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="text-sm border border-gray-200 rounded-md px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="best-match">Best match</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                savedPropertyId={isSignedIn ? (savedMap.get(property.id) ?? null) : undefined}
                onToggleSave={isSignedIn ? handleToggleSave : undefined}
              />
            ))}
          </div>
          <Pagination page={results.page} totalPages={results.totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </div>
  );
}
