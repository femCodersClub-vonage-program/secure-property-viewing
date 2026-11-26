import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ParallaxImage from './ParallaxImage'

describe('ParallaxImage', () => {
  it('is decorative, so assistive technology skips it', () => {
    render(<ParallaxImage src="/properties/property-03-cover.webp" />)

    expect(screen.getByRole('presentation')).toHaveAttribute(
      'src',
      '/properties/property-03-cover.webp',
    )
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
