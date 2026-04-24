import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import { PropertyCard } from '../components/PropertyCard';
import type { SearchResult } from '@proppulse/shared';

const API_URL = import.meta.env.VITE_API_URL ?? '';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (q: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, status: 'active' }),
      });
      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }
      const data = (await res.json()) as SearchResult;
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      void runSearch(q);
    }
  }, [searchParams, runSearch]);

  function handleSearch(q: string) {
    setSearchParams({ q });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Find your next home</h1>

      <div className="mb-8">
        <SearchBar onSearch={handleSearch} initialValue={query} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-16 text-gray-500">
          <div className="animate-spin text-4xl mb-3">⏳</div>
          <p>Searching properties...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-medium text-red-600">{error}</p>
          <p className="text-sm text-gray-500 mt-1">Check that the backend is running and try again.</p>
        </div>
      )}

      {/* No results */}
      {!isLoading && !error && results !== null && results.total === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏚️</div>
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">Try a different search — e.g. "Austin" or "Chicago condo"</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && results === null && query === '' && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏠</div>
          <p>Enter a city, zip code, or address above to find properties</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && results !== null && results.total > 0 && (
        <>
          {/* Result count + AI insight */}
          <div className="mb-4 flex flex-col gap-1">
            <p className="text-sm text-gray-500">
              {results.total} {results.total === 1 ? 'property' : 'properties'} found
              {results.totalPages > 1 && ` · page ${results.page} of ${results.totalPages}`}
            </p>
            {results.aiInsight && (
              <p className="text-sm text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
                {results.aiInsight}
              </p>
            )}
          </div>

          {/* Property grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
