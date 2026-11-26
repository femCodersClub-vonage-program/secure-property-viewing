import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import SiteFooter from './SiteFooter'

beforeEach(() => {
  render(
    <MemoryRouter>
      <SiteFooter />
    </MemoryRouter>,
  )
})

describe('SiteFooter', () => {
  it('says that the properties and the agency are fictional', () => {
    expect(screen.getByText(/The properties and the agency are fictional/)).toBeInTheDocument()
  })

  it('repeats the main links and adds the one for owners', () => {
    const nav = within(screen.getByRole('navigation', { name: 'Footer' }))
    expect(
      nav.getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Properties', '/properties'],
      ['How it works', '/#how-it-works'],
      ['List my property', '/list-property'],
      ['Agency sign in', '/agency/sign-in'],
    ])
  })

  it('links each person of the team to LinkedIn', () => {
    const team = within(screen.getByRole('region', { name: 'Meet the team on LinkedIn' }))
    const people = [
      ['Irina Ichim Tech lead and mentor', 'irina-ichim-desarrolladora'],
      ['Cande Zamora Full Stack Developer', 'cande-zamora-125301349'],
      ['Mayleth Carrascal Backend Developer', 'maylethcarrascal'],
      ['Kat Leverton Accessibility, QA & Full Stack', 'kat-leverton'],
      ['Viviana Andrango Full Stack Developer', 'viviana-andrango'],
      ['Damaris Castro Full Stack Developer', 'damariscastro'],
    ]

    expect(team.getAllByRole('link')).toHaveLength(people.length)
    people.forEach(([name, profile]) =>
      expect(team.getByRole('link', { name })).toHaveAttribute(
        'href',
        `https://www.linkedin.com/in/${profile}/`,
      ),
    )
  })
})
