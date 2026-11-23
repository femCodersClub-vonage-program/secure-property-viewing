import { DashboardHome } from '../features/agency-dashboard'

// D1: the summary comes from GET /api/agency/summary
function AgencyDashboardPage() {
  return (
    <>
      <title>Dashboard · Peephole</title>
      <DashboardHome />
    </>
  )
}

export default AgencyDashboardPage
