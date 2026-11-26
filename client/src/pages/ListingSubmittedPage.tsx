import { ListingSubmitted } from '../features/owner-listing'

// B5: the page only places the confirmation
function ListingSubmittedPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-8 sm:px-10">
      <title>Request sent · Peephole</title>
      <ListingSubmitted />
    </main>
  )
}

export default ListingSubmittedPage
