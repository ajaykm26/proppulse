import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Basic seed data with a small set of properties in NJ / NY area.
  // This is intentionally small and simple so Ajay can tweak/extend easily.
  const properties = [
    {
      address: '123 Maple St, Edison, NJ 08817',
      city: 'Edison',
      state: 'NJ',
      zipCode: '08817',
      priceCents: 489_000_00,
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
      address: '45 Grove Ave, Metuchen, NJ 08840',
      city: 'Metuchen',
      state: 'NJ',
      zipCode: '08840',
      priceCents: 729_000_00,
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
      address: '210 Main St Apt 5B, Jersey City, NJ 07302',
      city: 'Jersey City',
      state: 'NJ',
      zipCode: '07302',
      priceCents: 899_000_00,
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
      address: '500 W 43rd St Apt 9C, New York, NY 10036',
      city: 'New York',
      state: 'NY',
      zipCode: '10036',
      priceCents: 1_250_000_00,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1050,
      propertyType: 'condo',
      status: 'active',
      images: ['https://via.placeholder.com/800x600?text=Midtown+Condo'],
      aiSummary:
        'High-floor 2BR condo in Midtown West with doorman, gym, and quick access to subways.',
    },
  ];

  for (const data of properties) {
    await prisma.property.create({ data });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
