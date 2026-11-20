import type { RouteObject } from 'react-router'
import { AgencyLayout } from './features/agency-dashboard'
import AgencyDashboardPage from './pages/AgencyDashboardPage'
import AgencyPlaceholderPage from './pages/AgencyPlaceholderPage'
import AgencyVideoRoomPage from './pages/AgencyVideoRoomPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import VideoRoomPage from './pages/VideoRoomPage'
import VisitCalendarPage from './pages/VisitCalendarPage'
import VisitConfirmationPage from './pages/VisitConfirmationPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/properties/:id/visit', element: <VisitCalendarPage /> },
  { path: '/visits/:id/confirmation', element: <VisitConfirmationPage /> },
  { path: '/visits/room', element: <VideoRoomPage /> },
  // Outside AgencyLayout on purpose: the call needs the whole screen
  { path: '/agency/visits/:id/room', element: <AgencyVideoRoomPage /> },
  {
    path: '/agency',
    element: <AgencyLayout />,
    children: [
      { index: true, element: <AgencyDashboardPage /> },
      { path: 'properties', element: <AgencyPlaceholderPage title="Properties" /> },
      { path: 'listing-requests', element: <AgencyPlaceholderPage title="Listing requests" /> },
      {
        path: 'listing-requests/:id',
        element: <AgencyPlaceholderPage title="Request details" />,
      },
      { path: 'calendar', element: <AgencyPlaceholderPage title="Calendar" /> },
      { path: 'messages', element: <AgencyPlaceholderPage title="Messages" /> },
      { path: 'profile', element: <AgencyPlaceholderPage title="Profile" /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
