import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { startFakeVisitBookingApi } from './features/visit-booking'
import './index.css'
import { routes } from './routes'

// TEMPORARY: until #52 and #73 are in dev, `npm run dev` answers those endpoints with fake data
if (import.meta.env.DEV) {
  startFakeVisitBookingApi()
}

const router = createBrowserRouter(routes)

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('The #root element is missing from index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
