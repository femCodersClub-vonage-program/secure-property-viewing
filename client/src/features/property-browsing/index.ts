export { default as FeaturedProperties } from './components/FeaturedProperties'
export { default as PhotoGallery } from './components/PhotoGallery'
export { default as PropertyCard } from './components/PropertyCard'
export { default as PropertyList } from './components/PropertyList'
export { default as PropertyMap } from './components/PropertyMap'
export { default as VerificationBadge } from './components/VerificationBadge'
export { getProperties, getPropertyById } from './api'
export { formatBedrooms } from './bedrooms'
export { formatPrice } from './price'
export type {
  PropertySummary,
  PropertyDetail,
  PropertyType,
  Operation,
  Agency,
  CoverImage,
} from './types'
