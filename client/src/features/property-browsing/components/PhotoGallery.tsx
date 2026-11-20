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
    <figure
      role="region"
      aria-label="Photo gallery"
      className={['relative overflow-hidden rounded-md', className ?? ''].join(' ').trim()}
    >
      <img
        key={current.url}
        src={current.url}
        alt={current.altText}
        className="w-full h-72 object-cover sm:h-96"
      />
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-4">
          <Button
            variant="secondary"
            shape="circle"
            aria-label="Previous photo"
            onClick={prev}
            className="size-10"
          >
            ←
          </Button>
          <span
            className="font-body text-sm text-text-muted tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {index + 1} / {count}
          </span>
          <Button
            variant="secondary"
            shape="circle"
            aria-label="Next photo"
            onClick={next}
            className="size-10"
          >
            →
          </Button>
        </div>
      )}
    </figure>
  )
}

export default PhotoGallery
