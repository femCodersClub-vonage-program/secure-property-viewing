import type { RouteObject } from 'react-router'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import VisitCalendarPage from './pages/VisitCalendarPage'
import VisitConfirmationPage from './pages/VisitConfirmationPage'
import AgencyVideoRoomPage from './pages/AgencyVideoRoomPage'
import VideoRoomPage from './pages/VideoRoomPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/properties/:id/visit', element: <VisitCalendarPage /> },
  { path: '/visits/:id/confirmation', element: <VisitConfirmationPage /> },
  { path: '/visits/room', element: <VideoRoomPage /> },
  { path: '/agency/visits/:id/room', element: <AgencyVideoRoomPage /> },
  { path: '*', element: <NotFoundPage /> },
]
