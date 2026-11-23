export type PhoneVerificationPurpose = 'VISIT' | 'LISTING_REQUEST'

/** The answer of POST /api/phone-verifications. `checkUrl` only comes when the silent check is tried. */
export type StartedVerification = {
  id: number
  status: 'PENDING'
  resendAvailableAt: string
  checkUrl?: string
}

/** The answer of POST /api/phone-verifications/{id}/check when the code matches. */
export type CheckedVerification = {
  id: number
  status: 'VERIFIED'
}

/** The answer of the silent-check and sms-fallback endpoints. */
export type VerificationUpdate = {
  id: number
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED'
}

/** What the screen hands to the page that uses it once the phone is verified. */
export type VerifiedPhone = {
  verificationId: number
  phone: string
}

/** What the redirect from the mobile operator brings back in the URL fragment. */
export type SilentCheckResult =
  | { outcome: 'code'; requestId: string; code: string }
  | { outcome: 'error' }
  // Back in Peephole without a result, such as with the back button
  | { outcome: 'none' }

/**
 * Saved in sessionStorage before the check URL opens, because it reloads the page.
 * `form` is the host page's own data, which that page validates when it reads it back.
 */
export type SavedSilentCheck = {
  verificationId: number
  purpose: PhoneVerificationPurpose
  phone: string
  resendAvailableAt: string
  form: unknown
}

/** A silent check the host page picks up when the person comes back to Peephole. */
export type ResumedSilentCheck = {
  saved: SavedSilentCheck
  result: SilentCheckResult
}
