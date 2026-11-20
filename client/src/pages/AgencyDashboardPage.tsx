import { DashboardOverview, SAMPLE_SUMMARY } from '../features/agency-dashboard'

// TEMPORARY: sample data until GET /api/agency/summary is in dev
function AgencyDashboardPage() {
  return (
    <>
      <title>Dashboard · Peephole</title>
      <DashboardOverview summary={SAMPLE_SUMMARY} />
    </>
  )
}

export default AgencyDashboardPage
