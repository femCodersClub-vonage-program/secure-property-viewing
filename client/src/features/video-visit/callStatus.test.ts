import { describe, expect, it } from 'vitest'
import { statusMessage } from './callStatus'

describe('statusMessage', () => {
  it('says when the room opens, in Madrid time', () => {
    // 09:50 UTC is 10:50 in Madrid in winter
    const message = statusMessage({ kind: 'not-open', opensAt: new Date('2026-11-23T09:50:00Z') })
    expect(message).toContain('10:50')
  })

  it('explains how to allow the camera and microphone', () => {
    expect(statusMessage({ kind: 'permissions-denied' })).toMatch(/allow them/i)
  })

  it('shows the message of an error as it is', () => {
    expect(statusMessage({ kind: 'error', message: 'Try again.' })).toBe('Try again.')
  })
})
