import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PhotoGallery from './PhotoGallery'
import type { CoverImage } from '../types'

const images: CoverImage[] = [
  { url: '/photo-1.jpg', altText: 'Living room' },
  { url: '/photo-2.jpg', altText: 'Bedroom' },
  { url: '/photo-3.jpg', altText: 'Kitchen' },
]

describe('PhotoGallery', () => {
  it('shows the first image', () => {
    render(<PhotoGallery images={images} />)
    expect(screen.getByRole('img', { name: 'Living room' })).toBeInTheDocument()
  })

  it('shows next and previous controls for multiple images', () => {
    render(<PhotoGallery images={images} />)
    expect(screen.getByRole('button', { name: 'Next photo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous photo' })).toBeInTheDocument()
  })

  it('advances to the next photo', () => {
    render(<PhotoGallery images={images} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByRole('img', { name: 'Bedroom' })).toBeInTheDocument()
  })

  it('goes back to the previous photo', () => {
    render(<PhotoGallery images={images} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }))
    expect(screen.getByRole('img', { name: 'Living room' })).toBeInTheDocument()
  })

  it('wraps around from the last to the first photo', () => {
    render(<PhotoGallery images={images} />)
    for (let i = 0; i < images.length; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    }
    expect(screen.getByRole('img', { name: 'Living room' })).toBeInTheDocument()
  })

  it('shows no controls for a single image', () => {
    render(<PhotoGallery images={[images[0]!]} />)
    expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous photo' })).not.toBeInTheDocument()
  })

  it('renders nothing for an empty image list', () => {
    const { container } = render(<PhotoGallery images={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
