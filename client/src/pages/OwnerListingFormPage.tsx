import { OwnerListingForm } from '../features/owner-listing'

// B2 to B4: the page only places the form, all its logic lives in the feature
function OwnerListingFormPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <title>List my property · Peephole</title>
      <OwnerListingForm />
    </main>
  )
}

export default OwnerListingFormPage