import { describe, expect, it } from 'vitest'
import { roleFromConnectionData } from './roles'

describe('roleFromConnectionData', () => {
  it('reads the role the server puts in the connection data', () => {
    expect(roleFromConnectionData('role=VISITOR')).toBe('VISITOR')
    expect(roleFromConnectionData('role=GUEST')).toBe('GUEST')
    expect(roleFromConnectionData('role=AGENCY')).toBe('AGENCY')
  })

  it('returns undefined for data without a known role', () => {
    expect(roleFromConnectionData('')).toBeUndefined()
    expect(roleFromConnectionData('role=OWNER')).toBeUndefined()
  })
})