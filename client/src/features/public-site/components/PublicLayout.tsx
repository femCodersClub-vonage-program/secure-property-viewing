import { useRef } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import BackToTop from './BackToTop'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

function PublicLayout() {
  const topRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <div ref={topRef} tabIndex={-1}>
        <SiteHeader />
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
      <BackToTop topRef={topRef} />
      {/* A link in the footer would otherwise open the next page halfway down */}
      <ScrollRestoration />
    </div>
  )
}

export default PublicLayout
