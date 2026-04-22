import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApiResponse, ComparablesResult, ComparableProperty } from '@proppulse/shared';

interface Props {
  propertyId: string;
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

const matchLabelStyles: Record<string, string> = {
  strong: 'bg-green-100 text-green-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  nearby: 'bg-gray-100 text-gray-600',
};

function ComparableRow({ comp }: { comp: ComparableProperty }) {
  return (
    <Link
      to={`/properties/${comp.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-white px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{comp.address}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {comp.city}, {comp.state} {comp.zipCode}
        </p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0 text-right">
        {/* Beds / baths / sqft */}
        <div className="hidden sm:block text-xs text-gray-500 whitespace-nowrap">
          {comp.bedrooms}bd · {comp.bathrooms}ba · {comp.sqft.toLocaleString()} sqft
        </div>

        {/* Price */}
        <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
          {formatPrice(comp.priceCents)}
        </div>

        {/* Match label badge */}
        <span
          className={[
            'hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize',
            matchLabelStyles[comp.matchLabel] ?? 'bg-gray-100 text-gray-600',
          ].join(' ')}
        >
          {comp.matchLabel}
        </span>
      </div>
    </Link>
  );
}

export function ComparablesCard({ propertyId }: Props) {
  const [result, setResult] = useState<ComparablesResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    fetch(`/api/properties/${propertyId}/comparables`)
      .then((res) => res.json() as Promise<ApiResponse<ComparablesResult>>)
      .then((data) => {
        if (data.success && data.data) {
          setResult(data.data);
        } else {
          setError(data.error ?? 'Could not load comparables.');
        }
      })
      .catch(() => setError('Failed to load comparables. Is the backend running?'))
      .finally(() => setIsLoading(false));
  }, [propertyId]);

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-800">🏘️ Market Context &amp; Comparables</div>
        <p className="text-xs text-gray-500 mt-0.5">
          Similar properties in the same market to help you benchmark this listing.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-xs text-gray-400 animate-pulse">Loading comparables…</p>
      )}

      {/* Error */}
      {error && !isLoading && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Content */}
      {result && !isLoading && (
        <>
          {/* Market snapshot metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <div className="text-base font-semibold text-gray-900">
                {formatPrice(result.summary.medianComparablePriceCents)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Median Comp Price</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <div className="text-base font-semibold text-gray-900">
                {result.summary.averagePricePerSqft > 0
                  ? `$${result.summary.averagePricePerSqft.toLocaleString()}/sqft`
                  : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Avg $/sqft</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <div className="text-base font-semibold text-gray-900">
                {result.summary.activeComparableCount}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Comparables Found</div>
            </div>

            <div className="bg-white rounded-lg border border-gray-100 p-3 text-center">
              <div
                className={[
                  'text-base font-semibold',
                  result.summary.priceVsMedianPct > 0
                    ? 'text-red-600'
                    : result.summary.priceVsMedianPct < 0
                    ? 'text-green-600'
                    : 'text-gray-900',
                ].join(' ')}
              >
                {result.summary.medianComparablePriceCents > 0
                  ? formatPct(result.summary.priceVsMedianPct)
                  : '—'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">vs. Median</div>
            </div>
          </div>

          {/* Comparable property rows */}
          {result.comparables.length > 0 ? (
            <div className="space-y-2">
              {result.comparables.map((comp) => (
                <ComparableRow key={comp.id} comp={comp} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              No comparable properties found in this market yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
