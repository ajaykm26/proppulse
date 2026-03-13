import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBar } from '../components/SearchBar';
import type { SearchResult } from '@proppulse/shared';

/**
 * Property search page.
 * Shows the search bar and (eventually) the results grid.
 *
 * TODO:
 * - Wire up to POST /api/search
 * - Render property cards
 * - Add filter panel (price, beds, type, etc.)
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Run search when the URL query param changes
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      void runSearch(q);
    }
  }, [searchParams]);

  async function runSearch(q: string) {
    setIsLoading(true);
    try {
      // TODO: call the real backend
      // const res = await fetch('/api/search', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ query: q }),
      // });
      // const data = await res.json() as SearchResult;
      // setResults(data);

      // Stub: simulate a network call
      await new Promise((r) => setTimeout(r, 500));
      setResults({ properties: [], total: 0, page: 1, limit: 20, totalPages: 0 });
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

      {/* Results area */}
      {isLoading && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🔍</div>
          <p>Searching properties...</p>
        </div>
      )}

      {!isLoading && results !== null && results.total === 0 && (
        <div className="text-center py-16 text-gray-500">
          <div className="text-4xl mb-3">🏚️</div>
          <p className="font-medium">No properties found</p>
          <p className="text-sm mt-1">Try a different search — e.g. "2BR in Austin under $500k"</p>
        </div>
      )}

      {!isLoading && results === null && query === '' && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🏠</div>
          <p>Enter a search above to find properties</p>
        </div>
      )}

      {/* TODO: Property cards grid will go here */}
    </div>
  );
}
