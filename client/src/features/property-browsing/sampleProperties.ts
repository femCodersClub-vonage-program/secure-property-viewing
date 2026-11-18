import type { PropertyDetail } from './types'

export const SAMPLE_PROPERTIES: PropertyDetail[] = [
  {
    id: 1,
    title: 'Bright apartment in Gràcia',
    operation: 'RENT',
    propertyType: 'APARTMENT',
    priceEuros: 1250,
    area: 'Gràcia',
    bedrooms: 2,
    sizeM2: 78,
    floor: 2,
    latitude: 41.4036,
    longitude: 2.1566,
    coverImage: {
      url: '/properties/property-01-cover.webp',
      altText: 'Bright bedroom with a neatly made bed and glass doors opening onto a small balcony',
    },
    description: 'A bright two-bedroom home with a balcony near local shops.',
    agency: { name: 'Peephole Demo Agency', verified: true },
    videoVisitAvailable: true,
    images: [
      {
        url: '/properties/property-01-cover.webp',
        altText:
          'Bright bedroom with a neatly made bed and glass doors opening onto a small balcony',
      },
      {
        url: '/properties/interior-apartment-01.webp',
        altText: 'Open-plan living and dining area with wooden furniture',
      },
    ],
  },
  {
    id: 3,
    title: 'Compact studio in El Raval',
    operation: 'RENT',
    propertyType: 'STUDIO',
    priceEuros: 850,
    area: 'El Raval',
    bedrooms: 1,
    sizeM2: 38,
    floor: 1,
    latitude: 41.379,
    longitude: 2.1684,
    coverImage: {
      url: '/properties/property-03-cover.webp',
      altText: 'Compact bedroom with a neatly made bed beside a bright window',
    },
    description: 'A compact studio with an open-plan living and sleeping area.',
    agency: { name: 'Peephole Demo Agency', verified: true },
    videoVisitAvailable: false,
    images: [
      {
        url: '/properties/property-03-cover.webp',
        altText: 'Compact bedroom with a neatly made bed beside a bright window',
      },
      {
        url: '/properties/interior-studio-01.webp',
        altText: 'Small open-plan studio with a compact kitchen',
      },
    ],
  },
  {
    id: 14,
    title: 'Townhouse in Horta-Guinardó',
    operation: 'SALE',
    propertyType: 'HOUSE',
    priceEuros: 520000,
    area: 'Horta-Guinardó',
    bedrooms: 4,
    sizeM2: 156,
    floor: null,
    latitude: 41.421,
    longitude: 2.158,
    coverImage: {
      url: '/properties/property-14-cover.webp',
      altText: 'Green garden patio framed by open doors to a bright living room',
    },
    description: 'A multi-level home with four bedrooms and a private garden.',
    agency: { name: 'Peephole Demo Agency', verified: true },
    videoVisitAvailable: true,
    images: [
      {
        url: '/properties/property-14-cover.webp',
        altText: 'Green garden patio framed by open doors to a bright living room',
      },
      {
        url: '/properties/interior-house-02.webp',
        altText: 'House interior with a comfortable sofa and garden view',
      },
    ],
  },
  {
    id: 11,
    title: 'Apartment near Arc de Triomf',
    operation: 'SALE',
    propertyType: 'APARTMENT',
    priceEuros: 395000,
    area: 'El Born',
    bedrooms: 2,
    sizeM2: 82,
    floor: 3,
    latitude: 41.3855,
    longitude: 2.182,
    coverImage: {
      url: '/properties/property-11-cover.webp',
      altText: 'Small balcony with potted plants and a view over nearby rooftops',
    },
    description: 'A two-bedroom apartment with a bright living and dining room.',
    agency: { name: 'Peephole Demo Agency', verified: true },
    videoVisitAvailable: true,
    images: [
      {
        url: '/properties/property-11-cover.webp',
        altText: 'Small balcony with potted plants and a view over nearby rooftops',
      },
      {
        url: '/properties/interior-apartment-04.webp',
        altText: 'Apartment interior with a light sofa and dining table',
      },
    ],
  },
]
