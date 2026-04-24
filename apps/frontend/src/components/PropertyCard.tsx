import type { Property } from '@proppulse/shared';

interface PropertyCardProps {
  property: Property;
}

function formatPrice(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(2)}M`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dollars);
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  sold: 'bg-gray-100 text-gray-600',
  'off-market': 'bg-red-100 text-red-700',
};

export function PropertyCard({ property }: PropertyCardProps) {
  const {
    address,
    city,
    state,
    zipCode,
    priceCents,
    bedrooms,
    bathrooms,
    sqft,
    propertyType,
    status,
    aiSummary,
  } = property;

  const badgeCls = STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Image placeholder */}
      <div className="h-44 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-4xl">
        🏠
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Price & status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xl font-bold text-gray-900">{formatPrice(priceCents)}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${badgeCls}`}>
            {status}
          </span>
        </div>

        {/* Address */}
        <div>
          <p className="font-medium text-gray-800 text-sm leading-snug">{address}</p>
          <p className="text-gray-500 text-xs">
            {city}, {state} {zipCode}
          </p>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-gray-600 mt-1">
          <span>{bedrooms} bd</span>
          <span>{bathrooms} ba</span>
          <span>{sqft.toLocaleString()} sqft</span>
          <span className="capitalize text-gray-400">{propertyType}</span>
        </div>

        {/* AI summary */}
        {aiSummary && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
              <span className="font-medium text-primary-600">AI: </span>
              {aiSummary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
