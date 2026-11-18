import { DashboardOverview, SAMPLE_SUMMARY } from '../features/agency-dashboard'

// TEMPORARY: sample data until GET /api/agency/summary is in dev
function AgencyDashboardPage() {
  return <DashboardOverview summary={SAMPLE_SUMMARY} />
}

export default AgencyDashboardPage
