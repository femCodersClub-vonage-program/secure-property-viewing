import { ArrowUp } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** Appears once the visitor has scrolled a whole screen. `topRef` gets the focus back. */
function BackToTop({ topRef }: { topRef: RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > window.innerHeight)
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  if (!visible) return null

  function goToTop() {
    // The button is about to disappear, and the keyboard would be left with no focus
    topRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
  }

  // Above the map's attribution, which has to stay visible. The focus is white and dark, so it
  // shows on the white pages and on the dark footer
  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={goToTop}
      className="fixed right-4 bottom-12 xl:bottom-32 z-20 flex size-12 items-center justify-center rounded-pill border-2 border-surface-page bg-brand-primary text-text-light shadow-button focus-visible:ring-6 focus-visible:ring-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-light"
    >
      <ArrowUp className="size-6" aria-hidden="true" />
    </button>
  )
}

export default BackToTop
