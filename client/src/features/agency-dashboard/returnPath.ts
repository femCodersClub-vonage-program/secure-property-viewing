export const AGENCY_HOME = '/agency'
export const SIGN_IN_PATH = `${AGENCY_HOME}/sign-in`

/** The state the sign-in page receives from a protected page: where to go back after signing in. */
export type SignInState = { from: string }

// Only paths inside the agency area: never another site, such as //evil.example
function isAgencyPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value === AGENCY_HOME || value.startsWith(`${AGENCY_HOME}/`)) &&
    !value.startsWith(SIGN_IN_PATH)
  )
}

/** Where to go after signing in: the page the agent tried to open, or the dashboard home (D1). */
export function readReturnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state && isAgencyPath(state.from)) {
    return state.from
  }
  return AGENCY_HOME
}
