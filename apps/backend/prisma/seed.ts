import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script — 40 realistic properties across the NYC metro and NJ area.
 *
 * Idempotent: clears all existing Property rows before inserting so re-runs
 * are safe and produce a deterministic dataset.
 *
 * Run via:
 *   npm run seed              (convenience alias)
 *   npx prisma db seed        (Prisma native)
 */
async function main() {
  // Wipe existing properties so re-runs are idempotent
  await prisma.property.deleteMany();

  const properties = [
    // ── Jersey City, NJ ───────────────────────────────────────────────────────
    {
      address: '210 Main St Apt 5B',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07302',
      priceCents: 89900000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1100,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Jersey+City+Condo'],
      aiSummary:
        'Modern 2BR condo with NYC skyline views, garage parking, and PATH access within minutes.',
    },
    {
      address: '77 Hudson St Apt 12D',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07302',
      priceCents: 125000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1250,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=77+Hudson+JC'],
      aiSummary:
        'Luxury high-rise in the JC waterfront district. Floor-to-ceiling windows with river views, full-service building.',
    },
    {
      address: '381 Marin Blvd Unit 4A',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07302',
      priceCents: 74900000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 820,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Marin+Blvd+JC'],
      aiSummary:
        'Bright 1BR in the trendy Paulus Hook neighborhood, steps from Light Rail and ferry terminal.',
    },
    {
      address: '20 Newport Pkwy Apt 8C',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07310',
      priceCents: 68000000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 750,
      propertyType: 'condo',
      status: 'pending',
      images: ['https://via.placeholder.com/800x600?text=Newport+JC'],
      aiSummary:
        'Newport neighborhood 1BR with in-unit washer/dryer, gym, pool. Strong rental comps in this submarket.',
    },
    {
      address: '154 Monticello Ave',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07304',
      priceCents: 62500000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1500,
      propertyType: 'multi-family',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=JC+Multifamily'],
      aiSummary:
        'Two-unit investment property in the Heights, fully occupied. Cap rate ~5% at ask, solid upside on lease renewals.',
    },
    {
      address: '509 Summit Ave Unit 2',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07306',
      priceCents: 54900000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 980,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Summit+Ave+JC'],
      aiSummary:
        'Updated 2BR condo in Journal Square, close to PATH. Great value relative to downtown JC pricing.',
    },

    // ── Hoboken, NJ ───────────────────────────────────────────────────────────
    {
      address: '1125 Maxwell Ln Unit 606',
      city: 'Hoboken',
      state: 'NJ',
      zipCode: '07030',
      priceCents: 98000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1180,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Hoboken+Condo'],
      aiSummary:
        'Luxury 2BR in Hoboken with doorman, rooftop deck, and NYC skyline views. Steps from NJ Transit ferry.',
    },
    {
      address: '318 Clinton St',
      city: 'Hoboken',
      state: 'NJ',
      zipCode: '07030',
      priceCents: 115000000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1900,
      propertyType: 'townhouse',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Hoboken+Townhouse'],
      aiSummary:
        'Classic Hoboken brownstone-style townhouse with private backyard, parking, and modern kitchen reno.',
    },
    {
      address: '600 Harbor Blvd Apt 3E',
      city: 'Hoboken',
      state: 'NJ',
      zipCode: '07030',
      priceCents: 72000000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 700,
      propertyType: 'condo',
      status: 'pending',
      images: ['https://via.placeholder.com/800x600?text=Harbor+Blvd+Hoboken'],
      aiSummary:
        'Waterfront 1BR with direct views of Manhattan. Competitive price point for this Hoboken submarket.',
    },
    {
      address: '1000 Washington St Unit 201',
      city: 'Hoboken',
      state: 'NJ',
      zipCode: '07030',
      priceCents: 85000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1050,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Washington+St+Hoboken'],
      aiSummary:
        "Central Hoboken location. Walk to PATH, Washington Street restaurants, and Pier 13. Well-maintained building.",
    },

    // ── Newark, NJ ────────────────────────────────────────────────────────────
    {
      address: '52 Forest Hill Terrace',
      city: 'Newark',
      state: 'NJ',
      zipCode: '07106',
      priceCents: 34900000,
      bedrooms: 4,
      bathrooms: 2,
      sqft: 1900,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Newark+House'],
      aiSummary:
        'Spacious 4BR colonial in the Forest Hill neighborhood. Large lot, hardwood floors throughout, detached garage.',
    },
    {
      address: '174 Grumman Ave',
      city: 'Newark',
      state: 'NJ',
      zipCode: '07112',
      priceCents: 47500000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1600,
      propertyType: 'multi-family',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Newark+Multifamily'],
      aiSummary:
        'Three-unit multifamily in Weequahic. Strong rental demand near NJ Transit hubs. Value-add opportunity.',
    },
    {
      address: '88 Court St Apt 5',
      city: 'Newark',
      state: 'NJ',
      zipCode: '07102',
      priceCents: 28500000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 850,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Newark+Downtown+Condo'],
      aiSummary:
        'Affordable 2BR condo in downtown Newark. Near Prudential Center, PATH, and Rutgers-Newark campus.',
    },
    {
      address: '233 Clinton Ave',
      city: 'Newark',
      state: 'NJ',
      zipCode: '07108',
      priceCents: 38900000,
      bedrooms: 5,
      bathrooms: 2,
      sqft: 2200,
      propertyType: 'house',
      status: 'off-market',
      images: ['https://via.placeholder.com/800x600?text=Newark+Victorian'],
      aiSummary:
        'Victorian-era 5BR with original character details. Needs updating but strong bones and generous square footage.',
    },

    // ── Edison, NJ ────────────────────────────────────────────────────────────
    {
      address: '123 Maple St',
      city: 'Edison',
      state: 'NJ',
      zipCode: '08817',
      priceCents: 48900000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1800,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Edison+Home'],
      aiSummary:
        'Cozy 3BR colonial in Edison with updated kitchen, finished basement, and easy access to Metropark.',
    },
    {
      address: '87 Talmadge Rd',
      city: 'Edison',
      state: 'NJ',
      zipCode: '08820',
      priceCents: 56500000,
      bedrooms: 4,
      bathrooms: 2.5,
      sqft: 2100,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Edison+Colonial'],
      aiSummary:
        'Well-maintained 4BR in North Edison. Top-rated school district. New roof and HVAC installed 2022.',
    },
    {
      address: '22 Old Post Rd Unit 8',
      city: 'Edison',
      state: 'NJ',
      zipCode: '08817',
      priceCents: 33000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1050,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Edison+Condo'],
      aiSummary:
        'Ground-level 2BR condo with assigned parking. Low HOA fees, close to Raritan Valley Line station.',
    },

    // ── Metuchen, NJ ─────────────────────────────────────────────────────────
    {
      address: '45 Grove Ave',
      city: 'Metuchen',
      state: 'NJ',
      zipCode: '08840',
      priceCents: 72900000,
      bedrooms: 4,
      bathrooms: 2.5,
      sqft: 2400,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Metuchen+Home'],
      aiSummary:
        'Bright 4BR home in Metuchen with open floor plan, great schools, and walkable downtown access.',
    },
    {
      address: '110 Hillside Ave',
      city: 'Metuchen',
      state: 'NJ',
      zipCode: '08840',
      priceCents: 61000000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1700,
      propertyType: 'house',
      status: 'pending',
      images: ['https://via.placeholder.com/800x600?text=Metuchen+Ranch'],
      aiSummary:
        'Charming ranch-style 3BR steps from Metuchen train station. Updated bathrooms and new deck.',
    },

    // ── Manhattan, NY ─────────────────────────────────────────────────────────
    {
      address: '500 W 43rd St Apt 9C',
      city: 'New York',
      state: 'NY',
      zipCode: '10036',
      priceCents: 125000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1050,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Midtown+Condo'],
      aiSummary:
        'High-floor 2BR condo in Midtown West with doorman, gym, and quick access to subways.',
    },
    {
      address: '200 Riverside Blvd Apt 18F',
      city: 'New York',
      state: 'NY',
      zipCode: '10069',
      priceCents: 198000000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 1650,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Riverside+Manhattan'],
      aiSummary:
        'Elegant 3BR on the Upper West Side with park and Hudson River views. White-glove building, full amenities.',
    },
    {
      address: '420 E 54th St Apt 6B',
      city: 'New York',
      state: 'NY',
      zipCode: '10022',
      priceCents: 95000000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 700,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Midtown+East+Condo'],
      aiSummary:
        'Move-in ready 1BR in Sutton Place. Quiet tree-lined block, close to FDR and 2nd Ave subway.',
    },
    {
      address: '55 W 17th St Apt 4A',
      city: 'New York',
      state: 'NY',
      zipCode: '10011',
      priceCents: 148000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1200,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Chelsea+Condo'],
      aiSummary:
        'Loft-style 2BR in Chelsea with exposed brick, original beams, and south-facing light. Prime gallery district location.',
    },
    {
      address: '310 W 97th St Apt 10D',
      city: 'New York',
      state: 'NY',
      zipCode: '10025',
      priceCents: 87500000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 950,
      propertyType: 'condo',
      status: 'sold',
      images: ['https://via.placeholder.com/800x600?text=UWS+Condo'],
      aiSummary:
        'Classic Upper West Side 2BR pre-war co-op. High ceilings, herringbone floors, one block from Central Park.',
    },
    {
      address: '180 Water St Apt 21A',
      city: 'New York',
      state: 'NY',
      zipCode: '10038',
      priceCents: 172000000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1300,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=FiDi+Condo'],
      aiSummary:
        'Stunning 2BR in the Financial District with panoramic views, concierge, and private balcony.',
    },

    // ── Brooklyn, NY ──────────────────────────────────────────────────────────
    {
      address: '245 Hicks St Apt 3R',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      priceCents: 132000000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 1100,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Brooklyn+Heights+Condo'],
      aiSummary:
        'Renovated 2BR in Brooklyn Heights with private terrace. Promenade views, close to Manhattan Bridge.',
    },
    {
      address: '567 Macon St',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11233',
      priceCents: 109000000,
      bedrooms: 4,
      bathrooms: 2,
      sqft: 2100,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Bed-Stuy+Brownstone'],
      aiSummary:
        'Stunning Bed-Stuy brownstone with original stoop and parlor floor details. Two-family income opportunity.',
    },
    {
      address: '89 Flatbush Ave Apt 5C',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11217',
      priceCents: 82000000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 680,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Park+Slope+Condo'],
      aiSummary:
        'Chic 1BR in Park Slope close to Prospect Park. Brand-new building with roof deck and fitness center.',
    },
    {
      address: '1235 Atlantic Ave Unit 2',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11216',
      priceCents: 95000000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1400,
      propertyType: 'townhouse',
      status: 'pending',
      images: ['https://via.placeholder.com/800x600?text=Crown+Heights+Townhouse'],
      aiSummary:
        'Newly gut-renovated townhouse in Crown Heights with private backyard and modern open-plan layout.',
    },
    {
      address: '22 Montague Terrace',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11201',
      priceCents: 285000000,
      bedrooms: 5,
      bathrooms: 3.5,
      sqft: 3800,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Brooklyn+Heights+Townhouse'],
      aiSummary:
        'Grand landmarked townhouse on one of Brooklyn Heights most coveted blocks. Three stories with original details.',
    },
    {
      address: '490 Neptune Ave Apt 8H',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11224',
      priceCents: 39900000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 900,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Coney+Island+Condo'],
      aiSummary:
        'Ocean-view 2BR in Coney Island. Priced well below Brooklyn average — strong entry-level buy-and-hold candidate.',
    },

    // ── Queens, NY ────────────────────────────────────────────────────────────
    {
      address: '112-28 Queens Blvd Apt 6A',
      city: 'Forest Hills',
      state: 'NY',
      zipCode: '11375',
      priceCents: 62000000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 950,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Forest+Hills+Condo'],
      aiSummary:
        'Move-in ready 2BR in Forest Hills Gardens. Excellent schools, E/F/M/R subway lines within steps.',
    },
    {
      address: '38-10 Bowne St',
      city: 'Flushing',
      state: 'NY',
      zipCode: '11354',
      priceCents: 75000000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1600,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Flushing+House'],
      aiSummary:
        'Detached 3BR in Flushing near Main Street. Vibrant neighborhood, excellent transit access to Manhattan.',
    },
    {
      address: '25-15 Shore Blvd Apt 3C',
      city: 'Astoria',
      state: 'NY',
      zipCode: '11102',
      priceCents: 69500000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 880,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Astoria+Condo'],
      aiSummary:
        'Bright 2BR in Astoria near Astoria Park. Restaurant-rich neighborhood, N/W trains to Midtown in 20 min.',
    },
    {
      address: '133-20 Sanford Ave Unit 7E',
      city: 'Flushing',
      state: 'NY',
      zipCode: '11355',
      priceCents: 43500000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 720,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Flushing+1BR'],
      aiSummary:
        'Affordable 1BR condo near Flushing Meadows. Strong rental demand from local professionals.',
    },
    {
      address: '87-05 Main St',
      city: 'Jamaica',
      state: 'NY',
      zipCode: '11435',
      priceCents: 55000000,
      bedrooms: 4,
      bathrooms: 2,
      sqft: 1750,
      propertyType: 'multi-family',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Jamaica+Multifamily'],
      aiSummary:
        'Two-family home near JFK Airport and AirTrain. Consistent rental income with room to raise rents at renewal.',
    },

    // ── Hoboken extended / misc ───────────────────────────────────────────────
    {
      address: '700 Grove St Unit 3B',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07310',
      priceCents: 58000000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 870,
      propertyType: 'condo',
      status: 'sold',
      images: ['https://via.placeholder.com/800x600?text=Grove+St+JC'],
      aiSummary:
        'Recently sold 2BR near Grove St PATH. Comparable to pricing for active listings in the immediate area.',
    },
    {
      address: '11 Park Place Apt 1A',
      city: 'Newark',
      state: 'NJ',
      zipCode: '07102',
      priceCents: 19900000,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 620,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Newark+Park+Place'],
      aiSummary:
        'Entry-level 1BR in the Brick City neighborhood. Low price point for investors seeking cash-flow assets.',
    },
    {
      address: '45 Chestnut St',
      city: 'Montclair',
      state: 'NJ',
      zipCode: '07042',
      priceCents: 94000000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2600,
      propertyType: 'house',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Montclair+House'],
      aiSummary:
        'Classic Montclair Victorian with wraparound porch, original hardwood floors, and recently renovated kitchen. Walk to Bay Street train.',
    },
  ];

  await prisma.property.createMany({ data: properties });

  console.log(`Seeded ${properties.length} properties.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
