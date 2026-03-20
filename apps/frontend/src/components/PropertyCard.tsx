import { Link } from 'react-router-dom';
import type { Property } from '@proppulse/shared';

interface PropertyCardProps {
  property: Property;
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

export function PropertyCard({ property }: PropertyCardProps) {
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
