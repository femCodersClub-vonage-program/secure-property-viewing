import { useEffect, useRef } from 'react'
import { Outlet, ScrollRestoration, useLocation, useNavigationType } from 'react-router'
import BackToTop from './BackToTop'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

function PublicLayout() {
  const topRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLDivElement>(null)
  const { key } = useLocation()
  const navigationType = useNavigationType()

  // The next page opens at the top, so the focus can't stay on the footer link that opened it.
  // With "back" (POP) the page returns to where it was, and the focus is left alone
  useEffect(() => {
    if (navigationType !== 'POP' && footerRef.current?.contains(document.activeElement)) {
      topRef.current?.focus({ preventScroll: true })
    }
  }, [key, navigationType])

  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <div ref={topRef} tabIndex={-1}>
        <SiteHeader />
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
      <div ref={footerRef}>
        <SiteFooter />
      </div>
      <BackToTop topRef={topRef} />
      {/* A link in the footer would otherwise open the next page halfway down */}
      <ScrollRestoration />
    </div>
  )
}

export default PublicLayout
