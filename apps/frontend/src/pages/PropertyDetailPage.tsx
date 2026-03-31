import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import type { Property, ApiResponse, PropPulseScore, SavedProperty, CreateSavedPropertyInput } from '@proppulse/shared';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  sold: 'bg-red-100 text-red-800',
  'off-market': 'bg-gray-100 text-gray-600',
};

export function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState<PropPulseScore | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);

  // undefined = not yet loaded, null = not saved, string = savedPropertyId
  const [savedPropertyId, setSavedPropertyId] = useState<string | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!id || !isSignedIn) {
      setSavedPropertyId(isSignedIn === false ? null : undefined);
      return;
    }

    async function checkSaved() {
      try {
        const token = await getToken();
        const res = await fetch('/api/saved-properties', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = (await res.json()) as ApiResponse<SavedProperty[]>;
        if (data.success && data.data) {
          const match = data.data.find((sp) => sp.propertyId === id);
          setSavedPropertyId(match ? match.id : null);
        }
      } catch {
        setSavedPropertyId(null);
      }
    }

    void checkSaved();
  }, [id, isSignedIn, getToken]);

  async function handleToggleSave() {
    if (!id) return;
    setIsSaving(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      if (savedPropertyId) {
        await fetch(`/api/saved-properties/${savedPropertyId}`, { method: 'DELETE', headers });
        setSavedPropertyId(null);
      } else {
        const payload: CreateSavedPropertyInput = { propertyId: id };
        const res = await fetch('/api/saved-properties', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as ApiResponse<SavedProperty>;
        if (data.success && data.data) setSavedPropertyId(data.data.id);
      }
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    // Reset score state when we navigate to a different property
    setScore(null);
    setScoreError(null);

    fetch(`/api/properties/${id}`)
      .then((res) => res.json() as Promise<ApiResponse<Property>>)
      .then((data) => {
        if (data.success && data.data) {
          setProperty(data.data);
        } else {
          setError(data.error ?? 'Property not found.');
        }
      })
      .catch(() => setError('Failed to load property. Is the backend running?'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-500">
        <div className="text-4xl mb-3 animate-pulse">🏠</div>
        <p>Loading property...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="text-4xl mb-3">😕</div>
        <p className="text-gray-700 font-medium mb-1">{error}</p>
        <Link to="/search" className="text-sm text-primary-600 hover:underline">
          ← Back to search
        </Link>
      </div>
    );
  }

  if (!property) return null;

  const image = property.images[0] ?? 'https://via.placeholder.com/800x600?text=No+Image';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <Link to="/search" className="text-sm text-primary-600 hover:underline mb-6 inline-block">
        ← Back to search
      </Link>

      {/* Image */}
      <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 mb-6">
        <img src={image} alt={property.address} className="w-full h-full object-cover" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{formatPrice(property.priceCents)}</h1>
          <p className="text-gray-600 mt-1">
            {property.address}, {property.city}, {property.state} {property.zipCode}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {isSignedIn && savedPropertyId !== undefined && (
            <button
              type="button"
              onClick={() => void handleToggleSave()}
              disabled={isSaving}
              aria-label={savedPropertyId ? 'Unsave property' : 'Save property'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {savedPropertyId ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  Save
                </>
              )}
            </button>
          )}
          <span
            className={[
              'text-sm font-medium px-3 py-1 rounded-full capitalize whitespace-nowrap',
              statusStyles[property.status] ?? 'bg-gray-100 text-gray-800',
            ].join(' ')}
          >
            {property.status}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Bedrooms', value: String(property.bedrooms) },
          { label: 'Bathrooms', value: String(property.bathrooms) },
          { label: 'Square Feet', value: property.sqft.toLocaleString() },
          { label: 'Type', value: property.propertyType },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-gray-900 capitalize">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {property.aiSummary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6">
          <div className="text-sm font-semibold text-blue-800 mb-2">✨ AI Summary</div>
          <p className="text-sm text-blue-700 leading-relaxed">{property.aiSummary}</p>
        </div>
      )}

      {/* PropPulse Score */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-800">📊 PropPulse Score</div>
            <p className="text-xs text-gray-500">
              Investment-focused score and commentary for this property.
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!id) return;
              setIsScoring(true);
              setScoreError(null);

              try {
                const res = await fetch(`/api/properties/${id}/score`, {
                  method: 'POST',
                });
                const data = (await res.json()) as ApiResponse<PropPulseScore>;

                if (!data.success || !data.data) {
                  setScoreError(data.error ?? 'Failed to generate score.');
                  setScore(null);
                } else {
                  setScore(data.data);
                }
              } catch (err) {
                console.error('Failed to load PropPulse score', err);
                setScoreError('Could not reach the scoring service. Is the backend running?');
                setScore(null);
              } finally {
                setIsScoring(false);
              }
            }}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isScoring}
          >
            {isScoring ? 'Scoring…' : score ? 'Re-score property' : 'Generate score'}
          </button>
        </div>

        {scoreError && (
          <p className="text-xs text-red-600 mb-2">{scoreError}</p>
        )}

        {score && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{score.score}</span>
              <span className="text-xs uppercase tracking-wide text-gray-500">/ 100</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {score.summary}
            </p>

            {(score.pros?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-800 mb-1">Pros</div>
                <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                  {score.pros.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {(score.cons?.length ?? 0) > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-800 mb-1">Cons</div>
                <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                  {score.cons.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!score && !scoreError && !isScoring && (
          <p className="text-xs text-gray-500">
            Click "Generate score" to see an investment-oriented rating and summary for this property.
          </p>
        )}
      </div>

      {/* Listed date */}
      <p className="text-xs text-gray-400">
        Listed{' '}
        {new Date(property.listedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </div>
  );
}
