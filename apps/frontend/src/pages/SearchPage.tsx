import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { PropertyCard } from '../components/PropertyCard';
import { FilterPanel, hasActiveFilters } from '../components/FilterPanel';
import { Pagination } from '../components/Pagination';
import type { FilterValues } from '../components/FilterPanel';
import type { SearchResult, SearchQuery, PropertyType, PropertyStatus } from '@proppulse/shared';

/**
 * Parse a free-text search string into structured SearchQuery filters.
 *
 * Handles patterns like:
 *   "Edison, NJ"           → city + state
 *   "Jersey City NJ 07302" → city + state + zip
 *   "Edison"               → city only
 *   anything else          → passed as query (reserved for future AI parsing)
 */
function parseQuery(q: string): Partial<SearchQuery> {
  const trimmed = q.trim();
  if (!trimmed) return {};

  // Extract 5-digit zip code
  const zipMatch = trimmed.match(/\b(\d{5})\b/);
  const zipCode = zipMatch?.[1];
  const withoutZip = trimmed.replace(/\b\d{5}\b/, '').trim().replace(/,\s*$/, '').trim();

  // "City, ST" or "City ST"
  const cityStateMatch = withoutZip.match(/^(.+?),?\s+([A-Z]{2})$/i);
  if (cityStateMatch) {
    return {
      city: cityStateMatch[1].trim(),
      state: cityStateMatch[2].toUpperCase(),
      ...(zipCode && { zipCode }),
      query: trimmed,
    };
  }

  // Short plain-text string — treat as city name
  if (/^[a-z\s]+$/i.test(withoutZip) && withoutZip.split(' ').length <= 3) {
    return { city: withoutZip, ...(zipCode && { zipCode }), query: trimmed };
  }

  // Fall through — pass as free-text query
  return { query: trimmed };
}

/** Read FilterValues from URL search params */
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

/** Build a URL param record from query + filters (omits empty values, resets page) */
function buildParams(q: string, f: FilterValues, page?: number): Record<string, string> {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (f.minPrice) params.minPrice = f.minPrice;
  if (f.maxPrice) params.maxPrice = f.maxPrice;
  if (f.minBedrooms) params.minBeds = f.minBedrooms;
  if (f.minBathrooms) params.minBaths = f.minBathrooms;
  if (f.propertyType) params.type = f.propertyType;
  if (f.status) params.status = f.status;
  if (page && page > 1) params.page = String(page);
  return params;
}

/**
 * Property search page.
 * All search state is reflected in URL params so searches are shareable.
 * Calls POST /api/search and renders results as a PropertyCard grid.
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Draft filter state — reflects what's in the filter panel inputs
  const [filters, setFilters] = useState<FilterValues>(() => paramsToFilters(searchParams));

  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run search whenever URL params change (handles initial load, browser back/forward)
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const f = paramsToFilters(searchParams);

    // Sync draft filter state to URL
    setFilters(f);

    const hasInput = !!q || hasActiveFilters(f);
    if (hasInput) {
      void runSearch(q, page, f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function runSearch(q: string, page: number, f: FilterValues) {
    setIsLoading(true);
    setError(null);
    try {
      const body: SearchQuery = {
        ...parseQuery(q),
        ...(f.minPrice && { minPriceCents: Math.round(parseFloat(f.minPrice) * 100) }),
        ...(f.maxPrice && { maxPriceCents: Math.round(parseFloat(f.maxPrice) * 100) }),
        ...(f.minBedrooms && { minBedrooms: parseInt(f.minBedrooms, 10) }),
        ...(f.minBathrooms && { minBathrooms: parseFloat(f.minBathrooms) }),
        ...(f.propertyType && { propertyType: f.propertyType as PropertyType }),
        ...(f.status && { status: f.status as PropertyStatus }),
        page,
        limit: 20,
      };
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }
      const data = (await res.json()) as SearchResult;
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  /** Submit a new text search (resets page to 1) */
  function handleSearch(newQ: string) {
    setSearchParams(buildParams(newQ, filters));
  }

  /** Apply current filter panel values (resets page to 1) */
  function handleApplyFilters(nextFilters?: FilterValues) {
    const q = searchParams.get('q') ?? '';
    setSearchParams(buildParams(q, nextFilters ?? filters));
  }

  /** Navigate to a specific page, preserving all other params */
  function handlePageChange(newPage: number) {
    const q = searchParams.get('q') ?? '';
    const f = paramsToFilters(searchParams);
    setSearchParams(buildParams(q, f, newPage));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const q = searchParams.get('q') ?? '';
  const hasInput = !!q || hasActiveFilters(paramsToFilters(searchParams));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Find your next home</h1>

      {/* Search bar */}
      <div className="mb-4">
        <SearchBar onSearch={handleSearch} initialValue={q} />
      </div>

      {/* Filter panel */}
      <FilterPanel values={filters} onChange={setFilters} onApply={handleApplyFilters} />

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center py-16 text-gray-500 gap-4">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p>Searching properties...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <p className="text-sm text-red-500 mt-1">
            Make sure the backend is running:{' '}
            <code className="bg-red-100 px-1 rounded">npm run dev:backend</code>
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && results !== null && results.total === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏚️</div>
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">
            Try broadening your filters or a different search —{' '}
            <button
              className="text-primary-600 hover:underline"
              onClick={() => handleSearch('Edison, NJ')}
            >
              Edison, NJ
            </button>{' '}
            or{' '}
            <button
              className="text-primary-600 hover:underline"
              onClick={() => handleSearch('Jersey City')}
            >
              Jersey City
            </button>
          </p>
        </div>
      )}

      {/* Idle / initial state */}
      {!isLoading && !error && results === null && !hasInput && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏠</div>
          <p>Enter a search above to find properties</p>
          <p className="text-sm mt-2 text-gray-300">
            Try "Edison, NJ" · "Jersey City" · "New York, NY"
          </p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && results !== null && results.total > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {results.total} {results.total === 1 ? 'property' : 'properties'} found
            {results.totalPages > 1 && ` · page ${results.page} of ${results.totalPages}`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
          <Pagination
            page={results.page}
            totalPages={results.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}
