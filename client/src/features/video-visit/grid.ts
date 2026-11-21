/**
 * The Tailwind classes of the video grid for the number of people in the call.
 * Whole class names only: Tailwind can't find classes built from pieces.
 */
export function gridClasses(peopleCount: number): string {
  // Alone: one large video, centered, with a max width so it doesn't grow huge on desktop
  if (peopleCount <= 1) {
    return 'grid-cols-1 max-w-3xl mx-auto'
  }
  // Two people: stacked on a phone, side by side from a tablet up
  if (peopleCount === 2) {
    return 'grid-cols-1 sm:grid-cols-2'
  }
  // Three or more: up to three columns on a wide screen, as the spec asks
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}
