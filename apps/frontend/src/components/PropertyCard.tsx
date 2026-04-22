import { Link } from 'react-router-dom';
import type { Property } from '@proppulse/shared';

interface PropertyCardProps {
  property: Property;
  /** ID of the SavedProperty record if this property is already saved; null if not saved */
  savedPropertyId?: string | null;
  /** Called when user clicks the save/unsave heart. Parent manages optimistic state. */
  onToggleSave?: (propertyId: string, savedPropertyId: string | null) => void;
}

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

export function PropertyCard({ property, savedPropertyId, onToggleSave }: PropertyCardProps) {
  const {
    id,
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
    images,
    aiSummary,
  } = property;

  const image = images[0] ?? 'https://via.placeholder.com/800x600?text=No+Image';
  const isSaved = savedPropertyId != null;

  return (
    <Link to={`/properties/${id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="aspect-video relative overflow-hidden bg-gray-100 flex-shrink-0">
          <img
            src={image}
            alt={address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span
            className={[
              'absolute top-3 left-3 text-xs font-medium px-2 py-1 rounded-full capitalize',
              statusStyles[status] ?? 'bg-gray-100 text-gray-800',
            ].join(' ')}
          >
            {status}
          </span>

          {/* Save / unsave button — only rendered when parent provides the handler */}
          {onToggleSave && (
            <button
              type="button"
              aria-label={isSaved ? 'Unsave property' : 'Save property'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(id, savedPropertyId ?? null);
              }}
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 rounded-full bg-white/90 shadow hover:bg-white transition-colors"
            >
              {isSaved ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-500">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <div className="text-xl font-bold text-gray-900 mb-1">{formatPrice(priceCents)}</div>
          <div className="text-sm text-gray-600 mb-3">
            {address}, {city}, {state} {zipCode}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <span>{bedrooms} bd</span>
            <span className="text-gray-200">|</span>
            <span>{bathrooms} ba</span>
            <span className="text-gray-200">|</span>
            <span>{sqft.toLocaleString()} sqft</span>
            <span className="text-gray-200">|</span>
            <span className="capitalize">{propertyType}</span>
          </div>

          {/* AI Summary */}
          {aiSummary && (
            <p className="text-xs text-gray-500 line-clamp-2 border-t border-gray-100 pt-3 mt-auto">
              {aiSummary}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
