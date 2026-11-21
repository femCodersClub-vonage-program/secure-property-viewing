// Silent Authentication: specs/silent-authentication.md, "Decisions" and "Client"
import type {
  PhoneVerificationPurpose,
  ResumedSilentCheck,
  SavedSilentCheck,
  SilentCheckResult,
} from './types'

const STORAGE_KEY = 'peephole.silent-check'

// Vonage's Virtual Operator answers for these numbers, from any browser, while the team tests
const VIRTUAL_OPERATOR_PREFIX = '+990'

export function isVirtualOperatorNumber(phone: string): boolean {
  return phone.startsWith(VIRTUAL_OPERATOR_PREFIX)
}

// navigator.userAgentData is not in TypeScript's DOM types, and not every browser has it
function isPhoneBrowser(): boolean {
  const userAgentData: unknown = Reflect.get(navigator, 'userAgentData')
  if (
    typeof userAgentData === 'object' &&
    userAgentData !== null &&
    'mobile' in userAgentData &&
    typeof userAgentData.mobile === 'boolean'
  ) {
    return userAgentData.mobile
  }
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

/** The silent check needs the phone's mobile data, so it is only tried from a phone's browser. */
export function shouldTrySilentAuth(phone: string): boolean {
  return isVirtualOperatorNumber(phone) || isPhoneBrowser()
}

/** Returns false when the browser does not let the page save it, such as with storage blocked. */
export function saveSilentCheck(saved: SavedSilentCheck): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    return true
  } catch {
    return false
  }
}

export function clearSilentCheck(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage is blocked, so there is nothing saved to remove
  }
}

function isPurpose(value: unknown): value is PhoneVerificationPurpose {
  return value === 'VISIT' || value === 'LISTING_REQUEST'
}

function parseSavedSilentCheck(data: unknown): SavedSilentCheck | undefined {
  if (
    typeof data === 'object' &&
    data !== null &&
    'verificationId' in data &&
    typeof data.verificationId === 'number' &&
    'purpose' in data &&
    isPurpose(data.purpose) &&
    'phone' in data &&
    typeof data.phone === 'string' &&
    'resendAvailableAt' in data &&
    typeof data.resendAvailableAt === 'string' &&
    'form' in data
  ) {
    return {
      verificationId: data.verificationId,
      purpose: data.purpose,
      phone: data.phone,
      resendAvailableAt: data.resendAvailableAt,
      form: data.form,
    }
  }
  return undefined
}

/** The saved silent check, if there is a valid one. An old or broken entry is never trusted. */
export function readSilentCheck(): SavedSilentCheck | undefined {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored === null) {
      return undefined
    }
    const data: unknown = JSON.parse(stored)
    return parseSavedSilentCheck(data)
  } catch {
    return undefined
  }
}

/** Reads the fragment the operator's redirect adds, such as `#request_id=…&code=…`. */
export function readSilentCheckResult(hash: string): SilentCheckResult {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const requestId = params.get('request_id')
  const code = params.get('code')
  if (requestId && code) {
    return { outcome: 'code', requestId, code }
  }
  if (params.has('error_description') || params.has('request_id') || params.has('code')) {
    return { outcome: 'error' }
  }
  return { outcome: 'none' }
}

/** The silent check saved for this purpose, with what the person came back with. */
export function findSilentCheck(
  purpose: PhoneVerificationPurpose,
  hash: string,
): ResumedSilentCheck | undefined {
  const saved = readSilentCheck()
  if (saved?.purpose !== purpose) {
    return undefined
  }
  return { saved, result: readSilentCheckResult(hash) }
}

/** In the same tab, as the spec asks: the operator's last redirect brings the person back. */
export function openCheckUrl(url: string): void {
  window.location.assign(url)
}
