import { describe, expect, it } from 'vitest'
import { parseRoomLink } from './api'
import { roomLinkUrl, roomOpensAt } from './room'

describe('video visit API', () => {
  it('reads the room link of the spec example', () => {
    // specs/video-visit.md, "API": response 201 of POST /api/visits/{id}/room-links
    expect(parseRoomLink({ role: 'GUEST', token: '<token>' })).toEqual({
      role: 'GUEST',
      token: '<token>',
    })
  })

  it('refuses an answer that breaks the contract', () => {
    expect(() => parseRoomLink({ role: 'AGENCY', token: 'abc' })).toThrow()
    expect(() => parseRoomLink({ role: 'VISITOR', token: '' })).toThrow()
    expect(() => parseRoomLink({ role: 'VISITOR' })).toThrow()
    expect(() => parseRoomLink(null)).toThrow()
  })
})

describe('room', () => {
  it('builds the link with the token after #, so it never reaches a server', () => {
    expect(roomLinkUrl('abc_-1', 'https://peephole.example')).toBe(
      'https://peephole.example/visits/room#abc_-1',
    )
  })

  it('opens 10 minutes before the visit starts', () => {
    expect(roomOpensAt('2026-11-23T11:00:00+01:00').toISOString()).toBe('2026-11-23T09:50:00.000Z')
  })
})
