import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useUser, RedirectToSignIn } from '@clerk/clerk-react';
import type { ApiResponse, SavedProperty, SavedSearch } from '@proppulse/shared';

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

export function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [isLoadingSearches, setIsLoadingSearches] = useState(true);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          { label: 'New Matches', value: '—', icon: '🔔' },
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
                        {p.bedrooms} bd · {p.bathrooms} ba · {p.sqft.toLocaleString()} sqft · <span className="capitalize">{p.propertyType}</span>
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
