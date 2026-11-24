import type { RouteObject } from 'react-router'
import CatalogPage from './pages/CatalogPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import PropertyDetailsPage from './pages/PropertyDetailsPage'
import { AgencyLayout, RequireAgencySession } from './features/agency-dashboard'
import AgencyCalendarPage from './pages/AgencyCalendarPage'
import AgencyDashboardPage from './pages/AgencyDashboardPage'
import AgencyPlaceholderPage from './pages/AgencyPlaceholderPage'
import AgencySignInPage from './pages/AgencySignInPage'
import AgencyVideoRoomPage from './pages/AgencyVideoRoomPage'
import VerificationReturnPage from './pages/VerificationReturnPage'
import VideoRoomPage from './pages/VideoRoomPage'
import VisitCalendarPage from './pages/VisitCalendarPage'
import VisitConfirmationPage from './pages/VisitConfirmationPage'

export const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  { path: '/properties', element: <CatalogPage /> },
  { path: '/properties/:id', element: <PropertyDetailsPage /> },
  { path: '/properties/:id/visit', element: <VisitCalendarPage /> },
  { path: '/visits/:id/confirmation', element: <VisitConfirmationPage /> },
  { path: '/visits/room', element: <VideoRoomPage /> },
  // Where the mobile operator sends the person back after the silent check
  { path: '/verification/return', element: <VerificationReturnPage /> },
  // The only agency page open to a signed-out agent
  { path: '/agency/sign-in', element: <AgencySignInPage /> },
  {
    // No path: it only checks the session before any agency page, including the video room
    element: <RequireAgencySession />,
    children: [
      // Outside AgencyLayout on purpose: the call needs the whole screen
      { path: '/agency/visits/:id/room', element: <AgencyVideoRoomPage /> },
      {
        path: '/agency',
        element: <AgencyLayout />,
        children: [
          { index: true, element: <AgencyDashboardPage /> },
          { path: 'properties', element: <AgencyPlaceholderPage title="Properties" /> },
          {
            path: 'listing-requests',
            element: <AgencyPlaceholderPage title="Listing requests" />,
          },
          {
            path: 'listing-requests/:id',
            element: <AgencyPlaceholderPage title="Request details" />,
          },
          { path: 'calendar', element: <AgencyCalendarPage /> },
          { path: 'messages', element: <AgencyPlaceholderPage title="Messages" /> },
          { path: 'profile', element: <AgencyPlaceholderPage title="Profile" /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]
