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

/** Sort order for search results */
export type SortOption = 'best-match' | 'newest' | 'price-asc' | 'price-desc';

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
  /** Sort order (default: best-match, i.e. newest first) */
  sort?: SortOption;
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
// Saved searches
// ---------------------------------------------------------------------------

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedSearchInput {
  name: string;
  query: SearchQuery;
}

// ---------------------------------------------------------------------------
// Saved properties (favorites)
// ---------------------------------------------------------------------------

/** Deal pipeline status for a saved property */
export type DealStatus = 'watching' | 'analyzing' | 'offer_made' | 'passed';

export interface SavedProperty {
  id: string;
  propertyId: string;
  property: Property;
  notes?: string;
  dealStatus?: DealStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedPropertyInput {
  propertyId: string;
}

export interface UpdateSavedPropertyInput {
  notes?: string | null;
  dealStatus?: DealStatus | null;
}

// ---------------------------------------------------------------------------
// AI scoring
// ---------------------------------------------------------------------------

export type PropPulseFactorKey =
  | 'pricing'
  | 'sizeLayout'
  | 'marketStatus'
  | 'renterAppeal'
  | 'liquidity';

export interface PropPulseFactorScore {
  key: PropPulseFactorKey;
  label: string;
  score: number;
  insight: string;
}

/** AI-generated investment score and narrative for a property */
export interface PropPulseScore {
  /** Overall investment attractiveness from 0 (worst) to 100 (best) */
  score: number;
  /** Short narrative summary (2–3 paragraphs max) explaining the score */
  summary: string;
  /** Key advantages of the property/area */
  pros: string[];
  /** Key risks or drawbacks to be aware of */
  cons: string[];
  /** Component-level breakdown to make the score easier to trust */
  factors: PropPulseFactorScore[];
  /** How confident the model is given the available listing data */
  confidence: 'low' | 'medium' | 'high';
  /** Practical next steps for underwriting / diligence */
  nextSteps: string[];
}

// ---------------------------------------------------------------------------
// Comparables
// ---------------------------------------------------------------------------

/**
 * A comparable property — the full Property shape plus a human-readable
 * indicator of how closely it matches the subject property.
 */
export interface ComparableProperty extends Property {
  /**
   * Simple string label describing the match quality, e.g. "strong",
   * "moderate", or "nearby".  Informational only — not used for sorting.
   */
  matchLabel: string;
}

/** Market snapshot computed from the comparable set */
export interface ComparablesSummary {
  /** Median asking price across comparables, in USD cents */
  medianComparablePriceCents: number;
  /** Average price-per-sqft across comparables (0 if sqft unavailable) */
  averagePricePerSqft: number;
  /** Number of comparables returned */
  activeComparableCount: number;
  /**
   * How the subject property's price relates to the median comparable price,
   * expressed as a percentage.  Positive means above median, negative below.
   * e.g. +12.5 means the subject is 12.5 % above the median comparable price.
   */
  priceVsMedianPct: number;
}

/** Full payload returned by GET /api/properties/:id/comparables */
export interface ComparablesResult {
  comparables: ComparableProperty[];
  summary: ComparablesSummary;
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
