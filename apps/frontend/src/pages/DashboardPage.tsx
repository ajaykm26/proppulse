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
    limit: 8,
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
  const [savingPropertyIds, setSavingPropertyIds] = useState<Set<string>>(new Set());

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

  const portfolioInsights = useMemo(() => {
    if (savedProperties.length === 0) return null;
    const props = savedProperties.map((sp) => sp.property);
    const totalValueCents = props.reduce((sum, p) => sum + p.priceCents, 0);
    const sorted = [...props].sort((a, b) => a.priceCents - b.priceCents);
    const mid = Math.floor(sorted.length / 2);
    const medianCents =
      sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1].priceCents + sorted[mid].priceCents) / 2)
        : sorted[mid].priceCents;
    const cityCounts = new Map<string, number>();
    for (const p of props) {
      cityCounts.set(p.city, (cityCounts.get(p.city) ?? 0) + 1);
    }
    const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const withSqft = props.filter((p) => p.sqft > 0);
    const avgPricePerSqft =
      withSqft.length > 0
        ? Math.round(withSqft.reduce((sum, p) => sum + p.priceCents / p.sqft, 0) / withSqft.length / 100)
        : null;
    return { totalValueCents, medianCents, topCity, avgPricePerSqft, count: props.length, uniqueCities: cityCounts.size };
  }, [savedProperties]);

  const portfolioInsightSentence = useMemo(() => {
    if (!portfolioInsights) return null;
    const { count, uniqueCities, topCity, medianCents, avgPricePerSqft } = portfolioInsights;
    const propWord = count === 1 ? 'property' : 'properties';
    const cityWord = uniqueCities === 1 ? 'city' : 'cities';
    const verb = count === 1 ? 'spans' : 'span';
    let sentence = `Your ${count} saved ${propWord} ${verb} ${uniqueCities} ${cityWord}`;
    if (topCity && uniqueCities > 1) sentence += `, led by ${topCity}`;
    sentence += `, with a median price of ${formatPrice(medianCents)}`;
    if (avgPricePerSqft !== null) sentence += ` and an average of $${avgPricePerSqft.toLocaleString()}/sqft`;
    return `${sentence}.`;
  }, [portfolioInsights]);

  const opportunityPulse = useMemo(() => {
    const sorted = [...matchPreviews].sort((a, b) => b.newMatches.length - a.newMatches.length);
    const topSearch = sorted[0] && sorted[0].newMatches.length > 0 ? sorted[0] : null;
    return { totalFreshMatches: newMatchesCount, topSearch };
  }, [matchPreviews, newMatchesCount]);

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

  async function handleToggleSaveFromPreview(propertyId: string, savedPropertyId: string | null) {
    if (savingPropertyIds.has(propertyId)) return;
    setSavingPropertyIds((prev) => new Set([...prev, propertyId]));
    try {
      const token = await getToken();
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      if (savedPropertyId) {
        const res = await fetch(`/api/saved-properties/${savedPropertyId}`, {
          method: 'DELETE',
          headers: authHeaders,
        });
        const data = (await res.json()) as ApiResponse<{ id: string }>;
        if (!res.ok || !data.success) throw new Error(data.error ?? 'Failed to remove property');
        setSavedProperties((prev) => prev.filter((sp) => sp.id !== savedPropertyId));
      } else {
        const res = await fetch('/api/saved-properties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ propertyId }),
        });
        const data = (await res.json()) as ApiResponse<SavedProperty>;
        if (!res.ok || !data.success || !data.data) throw new Error(data.error ?? 'Failed to save property');
        setSavedProperties((prev) => [...prev, data.data!]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update saved properties');
    } finally {
      setSavingPropertyIds((prev) => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
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
              Listings from your saved searches — fresh matches shown first, unfavorited only.
            </p>
          </div>
          <Link to="/search" className="text-sm text-primary-600 hover:underline whitespace-nowrap">
            Explore search
          </Link>
        </div>

        {isLoadingMatches ? (
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-56" />
                  </div>
                  <div className="h-8 bg-gray-200 rounded-lg w-28" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {[1, 2].map((j) => (
                    <div key={j} className="rounded-xl bg-white border border-gray-100 h-28" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">🔔</div>
            <p>No saved searches yet.</p>
            <p className="text-sm mt-1">
              Save a search and PropPulse will surface fresh matching listings here.
            </p>
            <Link to="/search" className="inline-block mt-4 text-sm font-medium text-primary-600 hover:underline">
              Run your first search →
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {[...matchPreviews]
              .sort((a, b) => b.newMatches.length - a.newMatches.length)
              .map((preview) => {
                const newMatchIds = new Set(preview.newMatches.map((p) => p.id));
                const previewList = [
                  ...preview.newMatches,
                  ...preview.previewProperties.filter((p) => !newMatchIds.has(p.id)),
                ].slice(0, 4);

                return (
                  <div key={preview.search.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{preview.search.name}</h3>
                          {preview.newMatches.length > 0 ? (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              {preview.newMatches.length} new
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                              No new matches
                            </span>
                          )}
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
                        className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 flex-shrink-0"
                      >
                        View full search
                      </Link>
                    </div>

                    {previewList.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
                        No listings found for this search right now.{' '}
                        <Link to={savedSearchToUrl(preview.search)} className="text-primary-600 hover:underline">
                          Adjust your criteria
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {previewList.map((property) => {
                          const isNewMatch = newMatchIds.has(property.id);
                          const savedProp = savedProperties.find((sp) => sp.propertyId === property.id);
                          const spId = savedProp?.id ?? null;
                          const isSaved = spId !== null;
                          const isSaving = savingPropertyIds.has(property.id);

                          return (
                            <div
                              key={`${preview.search.id}-${property.id}`}
                              className="rounded-xl border border-white bg-white shadow-sm hover:border-primary-200 hover:shadow-md transition overflow-hidden"
                            >
                              <Link to={`/properties/${property.id}`} className="flex gap-4 p-4 block">
                                <div className="relative flex-shrink-0">
                                  <img
                                    src={property.images[0] ?? 'https://via.placeholder.com/320x220?text=No+Image'}
                                    alt={property.address}
                                    className="h-20 w-24 rounded-lg object-cover bg-gray-100"
                                  />
                                  <span
                                    className={[
                                      'absolute top-1 left-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize',
                                      property.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : property.status === 'pending'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : property.status === 'sold'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-600',
                                    ].join(' ')}
                                  >
                                    {property.status}
                                  </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-semibold text-gray-900 text-sm">
                                      {formatPrice(property.priceCents)}
                                    </div>
                                    {isNewMatch && (
                                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 whitespace-nowrap flex-shrink-0">
                                        New
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 truncate mt-0.5">
                                    {property.address}, {property.city}, {property.state}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1.5">
                                    {property.bedrooms} bd · {property.bathrooms} ba ·{' '}
                                    {property.sqft.toLocaleString()} sqft ·{' '}
                                    <span className="capitalize">{property.propertyType}</span>
                                  </div>
                                  {property.aiSummary && (
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-1.5">
                                      {property.aiSummary}
                                    </p>
                                  )}
                                </div>
                              </Link>

                              <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                                <span className="text-xs text-gray-400">
                                  Listed {formatListedDate(property.listedAt)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Link
                                    to={`/properties/${property.id}`}
                                    className="text-xs font-medium text-primary-600 hover:underline"
                                  >
                                    Details →
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => void handleToggleSaveFromPreview(property.id, spId)}
                                    disabled={isSaving}
                                    aria-label={isSaved ? 'Remove from saved properties' : 'Save property'}
                                    className={[
                                      'flex items-center justify-center w-7 h-7 rounded-full border transition-colors disabled:opacity-50',
                                      isSaved
                                        ? 'border-red-300 bg-red-50 text-red-500 hover:bg-red-100'
                                        : 'border-gray-200 bg-white text-gray-400 hover:border-red-300 hover:text-red-400',
                                    ].join(' ')}
                                  >
                                    {isSaving ? (
                                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        />
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8v8z"
                                        />
                                      </svg>
                                    ) : isSaved ? (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        className="w-3.5 h-3.5"
                                      >
                                        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                      </svg>
                                    ) : (
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-3.5 h-3.5"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                                        />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Portfolio Snapshot */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Portfolio Snapshot</h2>
          <p className="text-sm text-gray-500 mt-1">Quick metrics across your saved properties.</p>
        </div>

        {isLoadingProperties ? (
          <div className="text-center py-8 text-gray-400">Computing your portfolio metrics…</div>
        ) : !portfolioInsights ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">📊</div>
            <p>No saved properties yet.</p>
            <p className="text-sm mt-1">Save properties to see portfolio insights here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                {
                  label: 'Total Portfolio Value',
                  value: formatPrice(portfolioInsights.totalValueCents),
                  sub: `${portfolioInsights.count} ${portfolioInsights.count === 1 ? 'property' : 'properties'}`,
                },
                {
                  label: 'Median Price',
                  value: formatPrice(portfolioInsights.medianCents),
                  sub: 'across saved properties',
                },
                {
                  label: 'Top City',
                  value: portfolioInsights.topCity ?? '—',
                  sub:
                    portfolioInsights.uniqueCities > 1
                      ? `${portfolioInsights.uniqueCities} cities total`
                      : 'only city saved',
                },
                {
                  label: 'Avg $/sqft',
                  value:
                    portfolioInsights.avgPricePerSqft !== null
                      ? `$${portfolioInsights.avgPricePerSqft.toLocaleString()}`
                      : '—',
                  sub:
                    portfolioInsights.avgPricePerSqft !== null
                      ? 'among properties with sqft'
                      : 'sqft data unavailable',
                },
              ].map(({ label, value, sub }) => (
                <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
                  <div className="text-xs font-semibold text-gray-700 mt-1">{label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
            {portfolioInsightSentence && (
              <p className="text-sm text-gray-600 italic border-t border-gray-100 pt-3">{portfolioInsightSentence}</p>
            )}
          </>
        )}
      </div>

      {/* Search Opportunity Pulse */}
      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-8">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Search Opportunity Pulse</h2>
          <p className="text-sm text-gray-500 mt-1">
            Which of your saved searches is generating the most fresh activity.
          </p>
        </div>

        {isLoadingMatches ? (
          <div className="text-center py-6 text-gray-400">Checking saved searches for fresh matches…</div>
        ) : savedSearches.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <div className="text-2xl mb-2">🔍</div>
            <p>
              No saved searches yet.{' '}
              <Link to="/search" className="text-primary-600 hover:underline">
                Save a search
              </Link>{' '}
              to track new listings here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xl font-bold text-gray-900">{opportunityPulse.totalFreshMatches}</div>
                <div className="text-xs font-semibold text-gray-700 mt-1">Total Fresh Matches</div>
                <div className="text-xs text-gray-400 mt-0.5">across all saved searches</div>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="text-xl font-bold text-gray-900">
                  {opportunityPulse.topSearch ? opportunityPulse.topSearch.newMatches.length : 0}
                </div>
                <div className="text-xs font-semibold text-gray-700 mt-1">Hottest Search</div>
                <div className="text-xs text-gray-400 mt-0.5 truncate">
                  {opportunityPulse.topSearch ? opportunityPulse.topSearch.search.name : 'No fresh matches yet'}
                </div>
              </div>
            </div>
            {opportunityPulse.topSearch && (
              <Link
                to={savedSearchToUrl(opportunityPulse.topSearch.search)}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 flex-shrink-0"
              >
                View hottest search →
              </Link>
            )}
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
