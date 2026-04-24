import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const properties = [
  {
    address: '1842 Oak Street',
    city: 'Austin',
    state: 'TX',
    zipCode: '78704',
    priceCents: 45000000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1850,
    propertyType: 'house',
    status: 'active',
    images: [],
    aiSummary:
      'Charming South Austin bungalow with original hardwood floors and a large backyard. Walkable to South Congress dining and shops.',
  },
  {
    address: '340 W 2nd Street, Unit 12B',
    city: 'Austin',
    state: 'TX',
    zipCode: '78701',
    priceCents: 38500000,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 780,
    propertyType: 'condo',
    status: 'active',
    images: [],
    aiSummary:
      'Downtown high-rise condo with city views, modern finishes, and building amenities including a rooftop pool and concierge.',
  },
  {
    address: '5521 Maple Avenue',
    city: 'Dallas',
    state: 'TX',
    zipCode: '75235',
    priceCents: 52000000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2600,
    propertyType: 'house',
    status: 'active',
    images: [],
    aiSummary:
      'Spacious family home in Oak Lawn with a remodeled kitchen, three-car garage, and a pool. Highly rated school district.',
  },
  {
    address: '88 Harbor View Drive',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92101',
    priceCents: 97500000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1400,
    propertyType: 'condo',
    status: 'active',
    images: [],
    aiSummary:
      'Stunning bay-view condo in the Marina District. Floor-to-ceiling windows, private balcony, and a gated underground garage.',
  },
  {
    address: '214 Peachtree Lane',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30308',
    priceCents: 63000000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 2100,
    propertyType: 'townhouse',
    status: 'active',
    images: [],
    aiSummary:
      'Modern Midtown townhouse steps from Piedmont Park. Open-plan living, chef kitchen, and private rooftop terrace.',
  },
  {
    address: '1007 N Milwaukee Avenue',
    city: 'Chicago',
    state: 'IL',
    zipCode: '60642',
    priceCents: 41500000,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 1050,
    propertyType: 'condo',
    status: 'active',
    images: [],
    aiSummary:
      'Bright vintage-loft condo in Wicker Park with exposed brick, timber ceilings, and in-unit laundry. Two blocks to the Blue Line.',
  },
  {
    address: '932 Elm Street',
    city: 'Nashville',
    state: 'TN',
    zipCode: '37203',
    priceCents: 58900000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    propertyType: 'house',
    status: 'pending',
    images: [],
    aiSummary:
      'Beautifully renovated craftsman in The Gulch with a gourmet kitchen and wraparound porch. Minutes from Broadway entertainment.',
  },
  {
    address: '4401 Sunset Blvd, Unit 5',
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90027',
    priceCents: 85000000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    propertyType: 'condo',
    status: 'active',
    images: [],
    aiSummary:
      'Stylish Los Feliz condo with designer finishes, a private patio, and mountain views. Close to Griffith Park trails.',
  },
  {
    address: '771 Pine Street',
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101',
    priceCents: 72000000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1650,
    propertyType: 'townhouse',
    status: 'active',
    images: [],
    aiSummary:
      'Contemporary Capitol Hill townhouse with Puget Sound views, a private garage, and a rooftop deck perfect for sunset watching.',
  },
  {
    address: '230 Bourbon Street',
    city: 'New Orleans',
    state: 'LA',
    zipCode: '70116',
    priceCents: 34500000,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 1100,
    propertyType: 'house',
    status: 'active',
    images: [],
    aiSummary:
      'Historic Creole cottage in the French Quarter with a private courtyard, original cypress floors, and classic shuttered windows.',
  },
  {
    address: '15 Beacon Street, Unit 3A',
    city: 'Boston',
    state: 'MA',
    zipCode: '02108',
    priceCents: 88000000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1300,
    propertyType: 'condo',
    status: 'active',
    images: [],
    aiSummary:
      'Classic Beacon Hill condo with exposed brick, gas fireplace, and views of the Charles River. Steps to Boston Common.',
  },
  {
    address: '8800 Biscayne Blvd, PH2',
    city: 'Miami',
    state: 'FL',
    zipCode: '33138',
    priceCents: 119000000,
    bedrooms: 3,
    bathrooms: 3,
    sqft: 2200,
    propertyType: 'condo',
    status: 'active',
    images: [],
    aiSummary:
      'Penthouse with panoramic ocean views, private terrace, and a chef kitchen. Full-service luxury building with beach access.',
  },
];

async function main() {
  console.log('Seeding database with sample properties...');
  await prisma.property.deleteMany();
  await prisma.property.createMany({ data: properties });
  console.log(`Seeded ${properties.length} properties successfully.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
