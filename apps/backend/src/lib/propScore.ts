import { openai } from './openai.js';
import type { PropPulseScore } from '@proppulse/shared';

// Narrow internal representation of the fields we need for scoring. This keeps
// the scorer decoupled from Prisma types so it works even before `prisma generate`.
export interface PropertyForScoring {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  priceCents: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  propertyType: string;
  status: string;
}

/**
 * Compute a PropPulse investment score for a property.
 *
 * If OPENAI_API_KEY is not configured, falls back to a deterministic mock
 * implementation so the endpoint still works in local/dev environments.
 */
export async function getPropPulseScore(
  property: PropertyForScoring,
): Promise<PropPulseScore> {
  // Fallback: deterministic mock based only on property attributes.
  if (!process.env.OPENAI_API_KEY) {
    return mockScore(property);
  }

  // Real OpenAI-backed scoring. We keep this intentionally simple and
  // defensive: if anything goes wrong with the API, we fall back to the
  // mock implementation so the endpoint remains reliable.
  try {
    const prompt = buildScoringPrompt(property);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an investment-focused real estate analyst. Return concise, actionable analysis.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'prop_pulse_score',
          schema: {
            type: 'object',
            properties: {
              score: { type: 'number', minimum: 0, maximum: 100 },
              summary: { type: 'string' },
              pros: {
                type: 'array',
                items: { type: 'string' },
              },
              cons: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['score', 'summary', 'pros', 'cons'],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return mockScore(property);
    }

    const parsed = JSON.parse(raw) as PropPulseScore;

    // Final safety clamp
    const clampedScore = Math.min(100, Math.max(0, Math.round(parsed.score)));

    return {
      score: clampedScore,
      summary: parsed.summary,
      pros: parsed.pros ?? [],
      cons: parsed.cons ?? [],
    };
  } catch (err) {
    console.error('[propScore] Falling back to mock scorer:', err);
    return mockScore(property);
  }
}

function buildScoringPrompt(property: PropertyForScoring): string {
  const parts = [
    `Address: ${property.address}, ${property.city}, ${property.state} ${property.zipCode}`,
    `Price: $${(property.priceCents / 100).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    })}`,
    `Bedrooms: ${property.bedrooms}`,
    `Bathrooms: ${property.bathrooms}`,
    `Square feet: ${property.sqft}`,
    `Type: ${property.propertyType}`,
    `Status: ${property.status}`,
  ];

  return [
    'You are scoring this property strictly from an investment perspective (long-term hold, US market).',
    'Return a JSON object with fields: score (0-100), summary (2-3 paragraphs max), pros (string[]), cons (string[]).',
    '',
    ...parts,
  ].join('\n');
}

function mockScore(property: PropertyForScoring): PropPulseScore {
  // Simple deterministic heuristic based on price, size, and status.
  const base = 60;
  const sizeBoost = Math.min(15, Math.floor(property.sqft / 500));
  const bedroomBoost = Math.min(10, property.bedrooms * 2);
  const statusPenalty =
    property.status === 'sold'
      ? -10
      : property.status === 'pending'
        ? -5
        : property.status === 'off-market'
          ? -15
          : 0;

  const rawScore = base + sizeBoost + bedroomBoost + statusPenalty;
  const score = Math.min(95, Math.max(30, rawScore));

  const formattedPrice = `$${(property.priceCents / 100).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;

  const summary = `This property offers a balanced mix of livability and investment potential in ${property.city}, ${property.state}. Based on its price point of ${formattedPrice}, bedroom/bathroom mix, and overall size of roughly ${property.sqft.toLocaleString('en-US')} sq ft, it screens as a solid candidate for long-term hold investors.

At this score, it is not an obvious distressed bargain or an overheated outlier — instead it falls into the "workable deal" category where returns will depend heavily on your specific strategy, financing, and local market execution.`;

  const pros: string[] = [
    `${property.bedrooms} bedroom layout supports a broad pool of tenants and resale buyers`,
    `Livable size at roughly ${property.sqft.toLocaleString('en-US')} sq ft`,
    `Price point of ${formattedPrice} is within a typical range for the area`,
  ];

  const cons: string[] = [
    'Score is based on basic listing attributes only — no rent comps or expense underwriting included',
    'Local market trends, property condition, and financing terms may materially change actual returns',
  ];

  return { score, summary, pros, cons };
}
