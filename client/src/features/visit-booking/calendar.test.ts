import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayLabel,
  isMorning,
  madridDay,
  madridTime,
  monthGrid,
  monthLabel,
  monthsBetween,
} from './calendar'

describe('calendar', () => {
  it('reads a slot in Madrid time, whatever offset it comes with', () => {
    expect(madridTime('2026-11-19T11:30:00+01:00')).toBe('11:30')
    expect(madridTime('2026-11-19T10:30:00Z')).toBe('11:30')
    // Summer time in Madrid is UTC+2
    expect(madridTime('2026-06-10T09:00:00Z')).toBe('11:00')
  })

  it('puts a late slot on its Madrid day, not the UTC one', () => {
    expect(madridDay('2026-11-19T23:30:00Z')).toBe('2026-11-20')
  })

  it('lists the slots that start before 14:00 as morning', () => {
    expect(isMorning('2026-11-19T13:30:00+01:00')).toBe(true)
    expect(isMorning('2026-11-19T14:00:00+01:00')).toBe(false)
  })

  it('names days and months as the screen shows them', () => {
    expect(dayLabel('2026-11-19')).toBe('Thursday 19 November')
    expect(monthLabel('2026-11')).toBe('November 2026')
  })

  it('moves across the end of a month', () => {
    expect(addDays('2026-11-17', 14)).toBe('2026-12-01')
    expect(monthsBetween('2026-11-17', '2026-12-01')).toEqual(['2026-11', '2026-12'])
    expect(monthsBetween('2026-11-02', '2026-11-16')).toEqual(['2026-11'])
  })

  it('starts the weeks on Monday', () => {
    // 1 November 2026 is a Sunday: six empty cells before it
    const november = monthGrid('2026-11')
    expect(november.slice(0, 7)).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(november).toHaveLength(36)
    // 1 December 2026 is a Tuesday
    expect(monthGrid('2026-12').slice(0, 2)).toEqual([null, '2026-12-01'])
  })
})
