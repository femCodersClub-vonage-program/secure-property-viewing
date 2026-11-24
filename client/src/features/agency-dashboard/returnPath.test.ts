import { describe, expect, it } from 'vitest'
import { AGENCY_HOME, readReturnPath } from './returnPath'

describe('readReturnPath', () => {
  it('goes back to the agency page the agent tried to open', () => {
    expect(readReturnPath({ from: '/agency/visits/5/room' })).toBe('/agency/visits/5/room')
  })

  // Each case would send the agent somewhere unsafe or nowhere useful
  it.each([
    { name: 'no state, when she came straight to the sign-in page', state: null },
    { name: 'a path outside the agency area', state: { from: '/visits/room' } },
    { name: 'another site', state: { from: '//evil.example' } },
    { name: 'a path that only starts like the agency one', state: { from: '/agencyfake' } },
    { name: 'the sign-in page itself', state: { from: '/agency/sign-in' } },
    { name: 'a from that is not text', state: { from: 42 } },
  ])('goes to the dashboard home with $name', ({ state }) => {
    expect(readReturnPath(state)).toBe(AGENCY_HOME)
  })
})
