import { request } from '../../lib/http'
import type { CheckedVerification, PhoneVerificationPurpose, StartedVerification } from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseStartedVerification(data: unknown): StartedVerification {
  if (
    isObject(data) &&
    typeof data.id === 'number' &&
    data.status === 'PENDING' &&
    typeof data.resendAvailableAt === 'string'
  ) {
    return { id: data.id, status: 'PENDING', resendAvailableAt: data.resendAvailableAt }
  }
  throw new Error('Unexpected POST /api/phone-verifications response')
}

function parseCheckedVerification(data: unknown): CheckedVerification {
  if (isObject(data) && typeof data.id === 'number' && data.status === 'VERIFIED') {
    return { id: data.id, status: 'VERIFIED' }
  }
  throw new Error('Unexpected POST /api/phone-verifications/{id}/check response')
}

/** Sends a code by SMS. Calling it again with the same phone replaces the pending code. */
export function startPhoneVerification(
  phone: string,
  purpose: PhoneVerificationPurpose,
): Promise<StartedVerification> {
  return request('/api/phone-verifications', parseStartedVerification, {
    method: 'POST',
    body: JSON.stringify({ phone, purpose }),
  })
}

export function checkPhoneVerificationCode(id: number, code: string): Promise<CheckedVerification> {
  return request(`/api/phone-verifications/${id}/check`, parseCheckedVerification, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}
