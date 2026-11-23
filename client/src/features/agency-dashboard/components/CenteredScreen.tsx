import type { ReactNode } from 'react'

// The dashboard's look for screens without the navigation: signing in and checking the session
function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dashboard-page px-4 py-8 font-dashboard-body text-text-default">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}

export default CenteredScreen
