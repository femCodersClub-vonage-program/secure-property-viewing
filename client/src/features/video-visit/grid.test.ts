import { describe, expect, it } from 'vitest'
import { gridClasses } from './grid'

describe('gridClasses', () => {
  it('shows a single video large and centered', () => {
    // Alone in the room: one column, with a max width so it doesn't grow huge on desktop
    expect(gridClasses(1)).toBe('mx-auto w-full max-w-4xl grid-cols-1')
  })

  it('puts two videos side by side on a wide screen', () => {
    expect(gridClasses(2)).toBe('grid-cols-1 sm:grid-cols-2')
  })

  it('uses up to three columns for three people or more', () => {
    expect(gridClasses(3)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')
    expect(gridClasses(5)).toBe('grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')
  })
})
