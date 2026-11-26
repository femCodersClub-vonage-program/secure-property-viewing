import { useState } from 'react'
import { useLocation } from 'react-router'
import { OwnerListingForm } from '../features/owner-listing'
import { findSilentCheck } from '../features/phone-verification'

// B2 to B4: the page only places the form, all its logic lives in the feature
function OwnerListingFormPage() {
  const location = useLocation()
  const [resumedcheck] = useState(() => findSilentCheck('LISTING_REQUEST', location.hash))

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-10">
      <title>List my property · Peephole</title>
      <OwnerListingForm resumedCheck={resumedcheck} />
    </main>
  )
}

export default OwnerListingFormPage
