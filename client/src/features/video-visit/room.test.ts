import { describe, expect, it } from 'vitest'
import { readRoomToken } from './room'

describe('readRoomToken', () => {
  it('returns the token after the #', () => {
    expect(readRoomToken('#abc_DEF-123')).toBe('abc_DEF-123')
  })

  it('returns undefined when there is no token', () => {
    expect(readRoomToken('')).toBeUndefined()
    expect(readRoomToken('#')).toBeUndefined()
  })

  it('returns undefined when the token has characters a room token never has', () => {
    expect(readRoomToken('#abc<script>')).toBeUndefined()
  })
})