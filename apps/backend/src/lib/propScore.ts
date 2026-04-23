import { openai } from './openai.js';
import type { PropPulseFactorScore, PropPulseScore } from '@proppulse/shared';

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
            'You are an investment-focused real estate analyst. Return concise, actionable analysis that a buy-side operator can trust.',
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
              factors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string',
                      enum: ['pricing', 'sizeLayout', 'marketStatus', 'renterAppeal', 'liquidity'],
                    },
                    label: { type: 'string' },
                    score: { type: 'number', minimum: 0, maximum: 100 },
                    insight: { type: 'string' },
                  },
                  required: ['key', 'label', 'score', 'insight'],
                  additionalProperties: false,
                },
              },
              confidence: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
              },
              nextSteps: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['score', 'summary', 'pros', 'cons', 'factors', 'confidence', 'nextSteps'],
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

    return normalizeScore(parsed, property);
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
    'Return a JSON object with fields:',
    '- score: overall score from 0-100',
    '- summary: 2 short paragraphs max',
    '- pros: string[]',
    '- cons: string[]',
    '- factors: exactly 5 items for pricing, sizeLayout, marketStatus, renterAppeal, liquidity',
    '- confidence: low | medium | high',
    '- nextSteps: 3 short action items for the investor',
    '',
    ...parts,
  ].join('\n');
}

function normalizeScore(score: PropPulseScore, property: PropertyForScoring): PropPulseScore {
  const factors = score.factors
    .slice(0, 5)
    .map((factor) => ({
      ...factor,
      score: clampScore(factor.score),
    }));

  if (factors.length === 0) {
    return mockScore(property);
  }

  return {
    score: clampScore(score.score),
    summary: score.summary,
    pros: score.pros ?? [],
    cons: score.cons ?? [],
    factors,
    confidence: score.confidence ?? 'medium',
    nextSteps: score.nextSteps ?? [],
  };
}

function mockScore(property: PropertyForScoring): PropPulseScore {
  const pricePerSqft = property.sqft > 0 ? property.priceCents / 100 / property.sqft : 0;

  const pricing = clampScore(85 - Math.floor(pricePerSqft / 12));
  const sizeLayout = clampScore(45 + Math.min(30, Math.floor(property.sqft / 70)) + property.bedrooms * 2);
  const marketStatus =
    property.status === 'active'
      ? 78
      : property.status === 'pending'
        ? 58
        : property.status === 'sold'
          ? 32
          : 40;
  const renterAppeal = clampScore(48 + property.bedrooms * 6 + Math.round(property.bathrooms * 4));
  const liquidity = clampScore(
    70 +
      (property.propertyType === 'condo' ? 2 : 0) +
      (property.propertyType === 'house' ? 6 : 0) -
      (property.status === 'off-market' ? 18 : 0),
  );

  const factors: PropPulseFactorScore[] = [
    {
      key: 'pricing',
      label: 'Pricing',
      score: pricing,
      insight:
        pricePerSqft > 0
          ? `At about $${Math.round(pricePerSqft).toLocaleString('en-US')} per sq ft, the listing looks ${
              pricing >= 70 ? 'reasonably positioned' : 'somewhat expensive'
            } for quick underwriting.`
          : 'Pricing signal is incomplete because square-foot data is limited.',
    },
    {
      key: 'sizeLayout',
      label: 'Size & layout',
      score: sizeLayout,
      insight: `${property.bedrooms} bed / ${property.bathrooms} bath across ${property.sqft.toLocaleString(
        'en-US',
      )} sq ft gives this listing a ${sizeLayout >= 70 ? 'flexible' : 'narrower'} target-buyer profile.`,
    },
    {
      key: 'marketStatus',
      label: 'Market status',
      score: marketStatus,
      insight: `Current status is ${property.status}, which ${
        marketStatus >= 70
          ? 'keeps the opportunity actionable'
          : 'suggests execution risk or limited near-term availability'
      } for investors.`,
    },
    {
      key: 'renterAppeal',
      label: 'Renter appeal',
      score: renterAppeal,
      insight: `${property.bedrooms}-bedroom inventory tends to attract ${
        property.bedrooms >= 3 ? 'family and roommate demand' : 'singles and couples'
      }, helping this listing from a leasing perspective.`,
    },
    {
      key: 'liquidity',
      label: 'Exit liquidity',
      score: liquidity,
      insight: `${capitalize(property.propertyType)} inventory in ${property.city} should have ${
        liquidity >= 70 ? 'solid' : 'mixed'
      } resale depth if the basis works.`,
    },
  ];

  const averageScore = Math.round(
    factors.reduce((sum, factor) => sum + factor.score, 0) / factors.length,
  );
  const score = clampScore(Math.round(averageScore * 0.9 + 6));

  const formattedPrice = `$${(property.priceCents / 100).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })}`;

  const summary = `${property.address} screens as a ${
    score >= 75 ? 'strong' : score >= 60 ? 'workable' : 'speculative'
  } investor lead based on the raw listing profile. The combination of ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms, and roughly ${property.sqft.toLocaleString(
    'en-US',
  )} sq ft gives it practical utility, while the ${formattedPrice} ask sets the main underwriting constraint.

This score is intentionally grounded in listing-level heuristics, not rent rolls or neighborhood comps. Treat it as a fast first-pass filter: useful for deciding whether to dig deeper, not a substitute for full diligence.`;

  const pros: string[] = [
    `${property.bedrooms} bedroom layout supports broad renter and resale demand`,
    `Straightforward first-pass underwriting with a visible list price of ${formattedPrice}`,
    factors.find((factor) => factor.score === Math.max(...factors.map((item) => item.score)))?.insight ??
      'Several listing attributes are directionally supportive for investor review.',
  ];

  const cons: string[] = [
    'No rent comps, taxes, HOA dues, rehab scope, or neighborhood trend data are included yet',
    `Current score can shift materially once financing assumptions and local comps are added`,
    property.status !== 'active'
      ? `Status is ${property.status}, which may limit execution flexibility`
      : 'Listing-level data still needs a full diligence pass before any offer decision',
  ];

  const nextSteps = [
    'Pull rent comps and estimate stabilized monthly rent.',
    'Benchmark asking price against nearby sold and active comparables.',
    'Pressure-test taxes, insurance, and repair budget before moving to offer stage.',
  ];

  return {
    score,
    summary,
    pros,
    cons,
    factors,
    confidence: 'medium',
    nextSteps,
  };
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
