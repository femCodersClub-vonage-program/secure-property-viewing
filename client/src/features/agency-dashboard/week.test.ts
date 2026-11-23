import { describe, expect, it } from 'vitest'
import { addWeeks, currentWeekStart, weekDays, weekEnd, weekLabel, weekStart } from './week'

describe('weekStart', () => {
  it.each([
    ['2026-11-23', '2026-11-23'],
    ['2026-11-25', '2026-11-23'],
    ['2026-11-29', '2026-11-23'],
    ['2027-01-01', '2026-12-28'],
  ])('starts the week of %s on Monday %s', (day, monday) => {
    expect(weekStart(day)).toBe(monday)
  })
})

describe('currentWeekStart', () => {
  it('uses the day in Madrid, not in UTC', () => {
    // 23:30 UTC on Sunday 29 November is already 00:30 on Monday 30 in Madrid
    expect(currentWeekStart(new Date('2026-11-29T23:30:00Z'))).toBe('2026-11-30')
  })
})

describe('addWeeks', () => {
  it('moves to the previous and next Mondays, across months and years', () => {
    expect(addWeeks('2026-11-23', 1)).toBe('2026-11-30')
    expect(addWeeks('2026-11-23', -1)).toBe('2026-11-16')
    expect(addWeeks('2026-12-28', 1)).toBe('2027-01-04')
  })
})

describe('weekEnd and weekDays', () => {
  it('ends the week on Sunday, also in the week the clocks go back', () => {
    expect(weekEnd('2026-11-23')).toBe('2026-11-29')
    expect(weekEnd('2026-10-19')).toBe('2026-10-25')
  })

  it('lists the seven days from Monday to Sunday', () => {
    expect(weekDays('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ])
  })
})

describe('weekLabel', () => {
  it('names the week with its first and last days', () => {
    expect(weekLabel('2026-11-23')).toBe('23 November – 29 November 2026')
  })

  it('shows both years when the week crosses into a new one', () => {
    expect(weekLabel('2026-12-28')).toBe('28 December 2026 – 3 January 2027')
  })
})
