import { useState } from 'react'
import { Button } from '../../../components/ui'
import type { CoverImage } from '../types'

interface PhotoGalleryProps {
  images: CoverImage[]
  className?: string
}

function PhotoGallery({ images, className }: PhotoGalleryProps) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const current = images[index]

  if (count === 0 || !current) return null

  function prev() {
    setIndex((i) => (i - 1 + count) % count)
  }

  function next() {
    setIndex((i) => (i + 1) % count)
  }

  return (
    <section
      aria-label="Photo gallery"
      className={['relative overflow-hidden rounded-md', className ?? ''].join(' ').trim()}
    >
      <img
        key={current.url}
        src={current.url}
        alt={current.altText}
        className="w-full h-72 object-cover sm:h-96 lg:absolute lg:inset-0 lg:h-full"
      />
      {count > 1 && (
        // On white, so the buttons and their focus show over any photo
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <div className="flex items-center gap-4 rounded-pill bg-surface-page p-1.5 shadow-card">
            <Button
              variant="secondary"
              shape="circle"
              aria-label="Previous photo"
              onClick={prev}
              className="size-10"
            >
              <span aria-hidden="true">←</span>
            </Button>
            <span
              className="font-body text-sm text-text-muted tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              {index + 1} / {count}
              <span className="sr-only"> — {current.altText}</span>
            </span>
            <Button
              variant="secondary"
              shape="circle"
              aria-label="Next photo"
              onClick={next}
              className="size-10"
            >
              <span aria-hidden="true">→</span>
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

export default PhotoGallery
