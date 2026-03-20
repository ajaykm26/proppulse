import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { PropertyCard } from '../components/PropertyCard';
import type { SearchResult, SearchQuery } from '@proppulse/shared';

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

  // Fall through — pass as free-text query (for future AI parsing)
  return { query: trimmed };
}

/**
 * Property search page.
 * Calls POST /api/search and renders results as a PropertyCard grid.
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run search when the URL query param changes (including initial load)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      void runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function runSearch(q: string) {
    setIsLoading(true);
    setError(null);
    try {
      const body: SearchQuery = { ...parseQuery(q), limit: 20, page: 1 };
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

  function handleSearch(q: string) {
    setSearchParams({ q });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Find your next home</h1>

      {/* Search bar */}
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} initialValue={query} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <p>Searching properties...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500 mt-1">
            Make sure the backend is running:{' '}
            <code className="bg-gray-100 px-1 rounded">npm run dev:backend</code>
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && results !== null && results.total === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏚️</div>
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">
            Try a different search —{' '}
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
      {!isLoading && !error && results === null && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏠</div>
          <p>Enter a search above to find properties</p>
          <p className="text-sm mt-2 text-gray-300">
            Try "Edison, NJ" · "Jersey City" · "New York, NY"
          </p>
        </div>
      )}

      {/* Results grid */}
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
        </>
      )}
    </div>
  );
}
