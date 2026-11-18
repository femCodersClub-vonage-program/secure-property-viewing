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
  priceEuros: number
  area: string
  bedrooms: number
  sizeM2: number
  latitude: number | null
  longitude: number | null
  coverImage: CoverImage | null
  agency: Agency
}

export interface PropertyDetail extends PropertySummary {
  propertyType: PropertyType
  floor: number | null
  description: string
  videoVisitAvailable: boolean
  images: CoverImage[]
}
