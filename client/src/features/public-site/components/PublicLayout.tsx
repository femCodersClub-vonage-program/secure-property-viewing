import { Outlet, ScrollRestoration } from 'react-router'
import SiteFooter from './SiteFooter'
import SiteHeader from './SiteHeader'

function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-page">
      <SiteHeader />
      <div className="flex-1">
        <Outlet />
      </div>
      <SiteFooter />
      {/* A link in the footer would otherwise open the next page halfway down */}
      <ScrollRestoration />
    </div>
  )
}

export default PublicLayout
