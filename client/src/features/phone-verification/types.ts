export type PhoneVerificationPurpose = 'VISIT' | 'LISTING_REQUEST'

/** The answer of POST /api/phone-verifications: the code is on its way. */
export type StartedVerification = {
  id: number
  status: 'PENDING'
  resendAvailableAt: string
}

/** The answer of POST /api/phone-verifications/{id}/check when the code matches. */
export type CheckedVerification = {
  id: number
  status: 'VERIFIED'
}

/** What the screen hands to the page that uses it once the phone is verified. */
export type VerifiedPhone = {
  verificationId: number
  phone: string
}
