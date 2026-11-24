import { VisitsCalendar } from '../features/agency-dashboard'

// D4: the visits of each week come from GET /api/agency/visits
function AgencyCalendarPage() {
  return (
    <>
      <title>Calendar · Peephole</title>
      <VisitsCalendar />
    </>
  )
}

export default AgencyCalendarPage
