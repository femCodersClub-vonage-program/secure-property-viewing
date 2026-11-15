export type Operation = 'RENT' | 'SALE'
export type PropertyType = 'APARTMENT' | 'HOUSE' | 'STUDIO'

export interface CoverImage {
  url: string
  altText: string
}

export interface Agency {
  name: string
  verified: boolean
}

export interface PropertySummary {
  id: number
  title: string
  operation: Operation
  propertyType: PropertyType
  priceEuros: number
  area: string
  bedrooms: number
  sizeM2: number
  latitude: number | null
  longitude: number | null
  coverImage: CoverImage | null
}

export interface PropertyDetail extends PropertySummary {
  floor: number | null
  description: string
  videoVisitAvailable: boolean
  agency: Agency
  images: CoverImage[]
}
