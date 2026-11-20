import { ScreenPlaceholder } from '../features/agency-dashboard'

function AgencyPlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <title>{`${title} · Peephole`}</title>
      <ScreenPlaceholder title={title} />
    </>
  )
}

export default AgencyPlaceholderPage
