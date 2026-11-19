import type { RouteObject } from 'react-router'
import CatalogPage from './pages/CatalogPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import VisitCalendarPage from './pages/VisitCalendarPage'
import VisitConfirmationPage from './pages/VisitConfirmationPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/properties', element: <CatalogPage /> },
  { path: '/properties/:id/visit', element: <VisitCalendarPage /> },
  { path: '/visits/:id/confirmation', element: <VisitConfirmationPage /> },
  { path: '*', element: <NotFoundPage /> },
]
