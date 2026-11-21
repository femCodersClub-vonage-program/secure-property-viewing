import { request } from '../../lib/http'
import type {
  CheckedVerification,
  PhoneVerificationPurpose,
  StartedVerification,
  VerificationUpdate,
} from './types'

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
    const started: StartedVerification = {
      id: data.id,
      status: 'PENDING',
      resendAvailableAt: data.resendAvailableAt,
    }
    // The page leaves for this address, so only Vonage's own HTTPS one is followed
    if (typeof data.checkUrl === 'string' && data.checkUrl.startsWith('https://')) {
      started.checkUrl = data.checkUrl
    }
    return started
  }
  throw new Error('Unexpected POST /api/phone-verifications response')
}

function parseCheckedVerification(data: unknown): CheckedVerification {
  if (isObject(data) && typeof data.id === 'number' && data.status === 'VERIFIED') {
    return { id: data.id, status: 'VERIFIED' }
  }
  throw new Error('Unexpected POST /api/phone-verifications/{id}/check response')
}

const UPDATE_STATUSES = new Set(['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED'])

function isUpdateStatus(value: unknown): value is VerificationUpdate['status'] {
  return typeof value === 'string' && UPDATE_STATUSES.has(value)
}

function parseVerificationUpdate(data: unknown): VerificationUpdate {
  if (isObject(data) && typeof data.id === 'number' && isUpdateStatus(data.status)) {
    return { id: data.id, status: data.status }
  }
  throw new Error('Unexpected silent-check or sms-fallback response')
}

/**
 * Starts a verification. With `silentAuth`, the answer may bring a `checkUrl` for the silent check;
 * without one, the code goes by SMS. Calling it again with the same phone replaces the pending code.
 */
export function startPhoneVerification(
  phone: string,
  purpose: PhoneVerificationPurpose,
  silentAuth = false,
): Promise<StartedVerification> {
  return request('/api/phone-verifications', parseStartedVerification, {
    method: 'POST',
    body: JSON.stringify(silentAuth ? { phone, purpose, silentAuth } : { phone, purpose }),
  })
}

export function checkPhoneVerificationCode(id: number, code: string): Promise<CheckedVerification> {
  return request(`/api/phone-verifications/${id}/check`, parseCheckedVerification, {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
}

/** Sends what the operator's redirect brought back. */
export function checkSilentCode(
  id: number,
  requestId: string,
  code: string,
): Promise<VerificationUpdate> {
  return request(`/api/phone-verifications/${id}/silent-check`, parseVerificationUpdate, {
    method: 'POST',
    body: JSON.stringify({ requestId, code }),
  })
}

/** Moves the verification on to its SMS step, after a failed check or a return without a result. */
export function moveToSmsCode(id: number): Promise<VerificationUpdate> {
  return request(`/api/phone-verifications/${id}/sms-fallback`, parseVerificationUpdate, {
    method: 'POST',
  })
}
