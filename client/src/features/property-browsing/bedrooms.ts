/** Such as 'Studio', '1 bed' or '2 bedrooms': a home with no separate bedroom is a studio. */
export function formatBedrooms(bedrooms: number, unit: 'bed' | 'bedroom'): string {
  if (bedrooms === 0) return 'Studio'
  return bedrooms === 1 ? `1 ${unit}` : `${bedrooms} ${unit}s`
}
