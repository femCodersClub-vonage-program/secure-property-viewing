import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import {
  clearSilentCheck,
  readSilentCheck,
  VerificationNotFound,
} from '../features/phone-verification'
import { readSavedVisitForm, visitBookingPath } from '../features/visit-booking'
import { LISTING_FORM_PATH, readSavedListingForm } from '../features/owner-listing'

// Where the mobile operator's redirect lands (SILENT_AUTH_REDIRECT_URL on the server). It only
// sends the person back to the page they left, keeping the result in the fragment for that page
function VerificationReturnPage() {
  const location = useLocation()
  const [target] = useState(() => {
    const saved = readSilentCheck()
    if (saved?.purpose === 'VISIT') {
      const form = readSavedVisitForm(saved.form)
      return form ? visitBookingPath(form.propertyId) : undefined
    }
    if (saved?.purpose === 'LISTING_REQUEST') {
      return readSavedListingForm(saved.form) ? LISTING_FORM_PATH : undefined
    }
    return undefined
  })

  // A saved check that leads nowhere is an old or broken entry, so it is deleted
  useEffect(() => {
    if (!target) {
      clearSilentCheck()
    }
  }, [target])

  if (target) {
    return <Navigate to={{ pathname: target, hash: location.hash }} replace />
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8">
      <title>Verification not found · Peephole</title>
      <VerificationNotFound />
    </main>
  )
}

export default VerificationReturnPage
