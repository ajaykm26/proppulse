import type { Property } from '@proppulse/shared';

interface SearchInsightsProps {
  properties: Property[];
  total: number;
}

function formatDollars(cents: number): string {
  const d = cents / 100;
  if (d >= 1_000_000) return `$${(d / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(d / 1_000)}K`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function computeInsights(properties: Property[]) {
  const n = properties.length;
  if (n === 0) return null;

  // Median listing price
  const sorted = [...properties].sort((a, b) => a.priceCents - b.priceCents);
  const midIdx = Math.floor(n / 2);
  const medianPriceCents =
    n % 2 === 0
      ? (sorted[midIdx - 1]!.priceCents + sorted[midIdx]!.priceCents) / 2
      : sorted[midIdx]!.priceCents;

  // Average price per sqft
  const withSqft = properties.filter((p) => p.sqft > 0);
  const avgPricePerSqft =
    withSqft.length > 0
      ? Math.round(
          withSqft.reduce((s, p) => s + p.priceCents / 100 / p.sqft, 0) / withSqft.length,
        )
      : null;

  // Newest listing by ISO string comparison (lexicographic = chronological for ISO 8601)
  const newestListedAt = properties.reduce(
    (best, p) => (p.listedAt > best ? p.listedAt : best),
    properties[0]!.listedAt,
  );

  // Dominant property type
  const typeCounts: Record<string, number> = {};
  for (const p of properties) {
    typeCounts[p.propertyType] = (typeCounts[p.propertyType] ?? 0) + 1;
  }
  const [dominantType, dominantCount] = Object.entries(typeCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]!;

  // Active / pending split
  const activeCount = properties.filter((p) => p.status === 'active').length;
  const pendingCount = properties.filter((p) => p.status === 'pending').length;

  return {
    medianPriceCents,
    avgPricePerSqft,
    newestListedAt,
    dominantType,
    dominantCount,
    activeCount,
    pendingCount,
    n,
  };
}

function buildSummary(
  insights: NonNullable<ReturnType<typeof computeInsights>>,
  total: number,
): string {
  const { medianPriceCents, avgPricePerSqft, dominantType, dominantCount, activeCount, pendingCount, n } =
    insights;

  const typeLabel = dominantType.replace(/-/g, ' ');
  const typeShare = Math.round((dominantCount / n) * 100);
  const totalNote = total > n ? ` across ${total.toLocaleString()} total matches` : '';

  let s = `${n} listing${n !== 1 ? 's' : ''}${totalNote} — ${typeShare}% ${typeLabel}${typeShare !== 100 ? 's' : ''} — with a median price of ${formatDollars(medianPriceCents)}`;
  if (avgPricePerSqft !== null) s += ` ($${avgPricePerSqft}/sqft avg)`;
  s += '.';

  const listable = activeCount + pendingCount;
  if (listable > 0) {
    const pendingPct = Math.round((pendingCount / listable) * 100);
    if (pendingPct >= 25) {
      s += ` ${pendingPct}% are under contract — indicating strong buyer demand.`;
    } else {
      s += ` ${activeCount} active listing${activeCount !== 1 ? 's' : ''} available now.`;
    }
  }

  return s;
}

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
}

function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-white border border-blue-100 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 mb-0.5">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function SearchInsights({ properties, total }: SearchInsightsProps) {
  const insights = computeInsights(properties);
  if (!insights) return null;

  const { medianPriceCents, avgPricePerSqft, newestListedAt, dominantType, dominantCount, n } =
    insights;

  const typeShare = Math.round((dominantCount / n) * 100);
  const typeLabel = dominantType.replace(/-/g, ' ');

  return (
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-3">
        Search Insights
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <MetricCard label="Median Price" value={formatDollars(medianPriceCents)} />
        <MetricCard
          label="Avg $/sqft"
          value={avgPricePerSqft !== null ? `$${avgPricePerSqft}` : '—'}
        />
        <MetricCard label="Newest Listing" value={formatDate(newestListedAt)} />
        <MetricCard
          label="Listing Mix"
          value={`${typeShare}% ${typeLabel}`}
          sub={`${n} result${n !== 1 ? 's' : ''} on this page`}
        />
      </div>
      <p className="text-sm text-blue-800 leading-relaxed">{buildSummary(insights, total)}</p>
    </div>
  );
}
