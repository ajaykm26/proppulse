import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useUser, RedirectToSignIn } from '@clerk/clerk-react';
import type { ApiResponse, Property, SavedProperty, SavedSearch, SearchQuery, SearchResult, SortOption } from '@proppulse/shared';

interface SavedSearchMatchPreview {
  search: SavedSearch;
  total: number;
  newMatches: Property[];
  previewProperties: Property[];
}

function describeQuery(search: SavedSearch): string {
  const query = search.query;
  const parts: string[] = [];

  if (query.query) parts.push(query.query);
  if (query.city && query.state) parts.push(`${query.city}, ${query.state}`);
  if (query.propertyType) parts.push(query.propertyType);
  if (query.minBedrooms) parts.push(`${query.minBedrooms}+ bd`);
  if (query.maxPriceCents) parts.push(`under $${Math.round(query.maxPriceCents / 100).toLocaleString()}`);

  return parts.join(' • ') || 'Custom criteria';
}

const SORT_LABELS: Record<SortOption, string> = {
  'best-match': 'Best match',
  newest: 'Newest first',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
};

function sortLabel(sort: SortOption | undefined): string | null {
  if (!sort || sort === 'best-match') return null;
  return SORT_LABELS[sort];
}

function savedSearchToUrl(search: SavedSearch): string {
  const params = new URLSearchParams();
  const query = search.query;

  if (query.query) params.set('q', query.query);
  if (query.minPriceCents != null) params.set('minPrice', String(query.minPriceCents / 100));
  if (query.maxPriceCents != null) params.set('maxPrice', String(query.maxPriceCents / 100));
  if (query.minBedrooms != null) params.set('minBeds', String(query.minBedrooms));
  if (query.minBathrooms != null) params.set('minBaths', String(query.minBathrooms));
  if (query.propertyType) params.set('type', query.propertyType);
  if (query.status) params.set('status', query.status);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  if (query.sort && query.sort !== 'best-match') params.set('sort', query.sort);

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : '/search';
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatListedDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toPreviewQuery(query: SearchQuery): SearchQuery {
  return {
    ...query,
    page: 1,
    limit: 6,
  };
}

export function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [matchPreviews, setMatchPreviews] = useState<SavedSearchMatchPreview[]>([]);
  const [isLoadingSearches, setIsLoadingSearches] = useState(true);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function loadData() {
      setIsLoadingSearches(true);
      setIsLoadingProperties(true);
      setError(null);

      try {
        const token = await getToken();
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [searchesRes, propertiesRes] = await Promise.all([
          fetch('/api/saved-searches', { headers: authHeaders }),
          fetch('/api/saved-properties', { headers: authHeaders }),
        ]);

        const [searchesData, propertiesData] = await Promise.all([
          searchesRes.json() as Promise<ApiResponse<SavedSearch[]>>,
          propertiesRes.json() as Promise<ApiResponse<SavedProperty[]>>,
        ]);

        if (!searchesRes.ok || !searchesData.success || !searchesData.data) {
          throw new Error(searchesData.error ?? 'Failed to load saved searches');
        }
        if (!propertiesRes.ok || !propertiesData.success || !propertiesData.data) {
          throw new Error(propertiesData.error ?? 'Failed to load saved properties');
        }

        setSavedSearches(searchesData.data);
        setSavedProperties(propertiesData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoadingSearches(false);
        setIsLoadingProperties(false);
      }
    }

    void loadData();
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (isLoadingSearches || isLoadingProperties) return;

    if (savedSearches.length === 0) {
      setMatchPreviews([]);
      setIsLoadingMatches(false);
      setMatchesError(null);
      return;
    }

    let isCancelled = false;

    async function loadMatchPreviews() {
      setIsLoadingMatches(true);
      setMatchesError(null);

      try {
        const favoritePropertyIds = new Set(savedProperties.map((item) => item.propertyId));

        const previewResponses = await Promise.all(
          savedSearches.map(async (search) => {
            const res = await fetch('/api/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(toPreviewQuery(search.query)),
            });

            if (!res.ok) {
              throw new Error(`Failed to load matches for ${search.name}`);
            }

            const data = (await res.json()) as SearchResult;
            const createdAtMs = new Date(search.createdAt).getTime();
            const newMatches = data.properties.filter((property) => {
              const listedAtMs = new Date(property.listedAt).getTime();
              return listedAtMs > createdAtMs && !favoritePropertyIds.has(property.id);
            });

            return {
              search,
              total: data.total,
              newMatches,
              previewProperties: data.properties,
            } satisfies SavedSearchMatchPreview;
          }),
        );

        if (!isCancelled) {
          setMatchPreviews(previewResponses);
        }
      } catch (err) {
        if (!isCancelled) {
          setMatchPreviews([]);
          setMatchesError(err instanceof Error ? err.message : 'Failed to load match previews');
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMatches(false);
        }
      }
    }

    void loadMatchPreviews();

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, isSignedIn, isLoadingProperties, isLoadingSearches, savedProperties, savedSearches]);

  const newMatchesCount = useMemo(() => {
    const dedupedPropertyIds = new Set<string>();
    for (const preview of matchPreviews) {
      for (const property of preview.newMatches) {
        dedupedPropertyIds.add(property.id);
      }
    }
    return dedupedPropertyIds.size;
  }, [matchPreviews]);

  async function handleDeleteSavedSearch(id: string) {
    try {
      const token = await getToken();
      const res = await fetch(`/api/saved-searches/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as ApiResponse<{ id: string }>;
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to delete saved search');
      }

      setSavedSearches((current) => current.filter((item) => item.id !== id));
      setMatchPreviews((current) => current.filter((item) => item.search.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete saved search');
    }
  }

  async function handleUnsaveProperty(savedPropertyId: string) {
    try {
      const token = await getToken();
      const res = await fetch(`/api/saved-properties/${savedPropertyId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = (await res.json()) as ApiResponse<{ id: string }>;
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Failed to unsave property');
      }

      setSavedProperties((current) => current.filter((item) => item.id !== savedPropertyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unsave property');
    }
  }

  if (!isLoaded) {
    return <div className="flex items-center justify-center py-24 text-gray-500">Loading...</div>;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName ?? user.emailAddresses[0]?.emailAddress ?? 'there'} 👋
        </h1>
        <p className="text-gray-600 mt-1">Here's your real estate activity at a glance.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Saved Searches', value: isLoadingSearches ? '…' : String(savedSearches.length), icon: '🔍' },
          { label: 'Saved Properties', value: isLoadingProperties ? '…' : String(savedProperties.length), icon: '❤️' },
          {
            label: 'New Matches',
            value: isLoadingMatches ? '…' : String(newMatchesCount),
            icon: '🔔',
          },
        ].map(({ label, value, icon }) => (
          <div
            key={label}
            className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex items-center gap-4"
          >
            <div className="text-3xl">{icon}</div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mb-6 text-sm text-red-600">{error}</p>}
      {matchesError && <p className="mb-6 text-sm text-amber-700">{matchesError}</p>}

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent Matches</h2>
            <p className="text-sm text-gray-500 mt-1">
              Fresh listings from your saved searches, excluding properties you've already favorited.
            </p>
          </div>
          <Link to="/search" className="text-sm text-primary-600 hover:underline">
            Explore search
          </Link>
        </div>

        {isLoadingMatches ? (
          <div className="text-center py-10 text-gray-400">Checking your saved searches for new matches…</div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">🔔</div>
            <p>No saved searches yet.</p>
            <p className="text-sm mt-1">
              Save a search and PropPulse will surface fresh matching listings here.
            </p>
          </div>
        ) : matchPreviews.every((preview) => preview.newMatches.length === 0) ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">✨</div>
            <p>No fresh matches right now.</p>
            <p className="text-sm mt-1">Your dashboard will light up here when new listings land.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {matchPreviews
              .filter((preview) => preview.newMatches.length > 0)
              .sort((a, b) => b.newMatches.length - a.newMatches.length)
              .map((preview) => (
                <div key={preview.search.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{preview.search.name}</h3>
                        <span className="rounded-full bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700">
                          {preview.newMatches.length} new
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{describeQuery(preview.search)}</p>
                      {sortLabel(preview.search.query.sort) && (
                        <p className="text-xs text-primary-600 mt-1">
                          Sorted by: {sortLabel(preview.search.query.sort)}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {preview.total} total match{preview.total === 1 ? '' : 'es'} · saved{' '}
                        {new Date(preview.search.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <Link
                      to={savedSearchToUrl(preview.search)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      View full search
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {preview.newMatches.slice(0, 4).map((property) => (
                      <Link
                        key={`${preview.search.id}-${property.id}`}
                        to={`/properties/${property.id}`}
                        className="rounded-xl border border-white bg-white p-4 shadow-sm hover:border-primary-200 hover:shadow-md transition"
                      >
                        <div className="flex gap-4">
                          <img
                            src={property.images[0] ?? 'https://via.placeholder.com/320x220?text=No+Image'}
                            alt={property.address}
                            className="h-20 w-24 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="font-semibold text-gray-900">{formatPrice(property.priceCents)}</div>
                              <div className="text-xs text-green-600 whitespace-nowrap">New</div>
                            </div>
                            <div className="text-sm text-gray-600 truncate mt-1">
                              {property.address}, {property.city}, {property.state}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {property.bedrooms} bd · {property.bathrooms} ba · {property.sqft.toLocaleString()} sqft
                            </div>
                            <div className="text-xs text-gray-400 mt-2">Listed {formatListedDate(property.listedAt)}</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Saved Properties */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Saved Properties</h2>
            <p className="text-sm text-gray-500 mt-1">Properties you've favorited for easy follow-up.</p>
          </div>
          <Link to="/search" className="text-sm text-primary-600 hover:underline">
            Browse listings
          </Link>
        </div>

        {isLoadingProperties ? (
          <div className="text-center py-10 text-gray-400">Loading saved properties…</div>
        ) : savedProperties.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">❤️</div>
            <p>No saved properties yet.</p>
            <p className="text-sm mt-1">
              <Link to="/search" className="text-primary-600 hover:underline">
                Browse listings
              </Link>{' '}
              and click the heart to save properties you like.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedProperties.map((sp) => {
              const p = sp.property;
              return (
                <div
                  key={sp.id}
                  className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {p.images[0] && (
                      <img
                        src={p.images[0]}
                        alt={p.address}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-200"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900">{formatPrice(p.priceCents)}</div>
                      <div className="text-sm text-gray-600 truncate">
                        {p.address}, {p.city}, {p.state}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {p.bedrooms} bd · {p.bathrooms} ba · {p.sqft.toLocaleString()} sqft ·{' '}
                        <span className="capitalize">{p.propertyType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link
                      to={`/properties/${p.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleUnsaveProperty(sp.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Saved Searches */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Saved Searches</h2>
            <p className="text-sm text-gray-500 mt-1">Keep reusable search criteria handy for quick follow-up.</p>
          </div>
          <Link to="/search" className="text-sm text-primary-600 hover:underline">
            + New saved search
          </Link>
        </div>

        {isLoadingSearches ? (
          <div className="text-center py-10 text-gray-400">Loading saved searches…</div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <p>No saved searches yet.</p>
            <p className="text-sm mt-1">
              <Link to="/search" className="text-primary-600 hover:underline">
                Run a search
              </Link>{' '}
              and save it to track new listings automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium text-gray-900">{search.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{describeQuery(search)}</div>
                  {sortLabel(search.query.sort) && (
                    <div className="text-xs text-primary-600 mt-1">
                      Sorted by: {sortLabel(search.query.sort)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    Saved {new Date(search.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to={savedSearchToUrl(search)}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Run search
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSavedSearch(search.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
