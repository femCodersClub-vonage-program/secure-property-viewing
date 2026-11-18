import type { RouteObject } from 'react-router'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import VisitCalendarPage from './pages/VisitCalendarPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/properties/:id/visit', element: <VisitCalendarPage /> },
  { path: '*', element: <NotFoundPage /> },
]
