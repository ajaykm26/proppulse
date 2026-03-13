/**
 * Shared TypeScript types for PropPulse.
 * Used by both frontend and backend to ensure type consistency.
 */

// ---------------------------------------------------------------------------
// Property
// ---------------------------------------------------------------------------

/** A real estate property listing */
export interface Property {
  id: string;
  /** Full address string, e.g. "123 Main St, Brooklyn, NY 11201" */
  address: string;
  city: string;
  state: string;
  zipCode: string;
  /** Listing price in USD cents to avoid floating point issues */
  priceCents: number;
  /** Number of bedrooms */
  bedrooms: number;
  /** Number of bathrooms */
  bathrooms: number;
  /** Square footage */
  sqft: number;
  /** Property type */
  propertyType: PropertyType;
  /** Current listing status */
  status: PropertyStatus;
  /** List of image URLs */
  images: string[];
  /** ISO 8601 date string */
  listedAt: string;
  /** ISO 8601 date string */
  updatedAt: string;
  /** Optional AI-generated description/summary */
  aiSummary?: string;
}

export type PropertyType = 'house' | 'condo' | 'townhouse' | 'multi-family' | 'land' | 'other';

export type PropertyStatus = 'active' | 'pending' | 'sold' | 'off-market';

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

/** Input parameters for a property search */
export interface SearchQuery {
  /** Free-text search or natural language query */
  query?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  minPriceCents?: number;
  maxPriceCents?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  minSqft?: number;
  maxSqft?: number;
  propertyType?: PropertyType;
  status?: PropertyStatus;
  /** Pagination */
  page?: number;
  /** Results per page (default 20, max 100) */
  limit?: number;
}

/** The result of a property search */
export interface SearchResult {
  properties: Property[];
  total: number;
  page: number;
  limit: number;
  /** Total pages available */
  totalPages: number;
  /** Optional AI-generated summary of the search results */
  aiInsight?: string;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/** Generic API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
