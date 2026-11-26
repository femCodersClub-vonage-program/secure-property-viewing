import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '../../../routes'

describe('list my property (B1)', () => {
  it('shows the headline and the three trust points, and starts the form', async () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/list-property'] })
    render(<RouterProvider router={router} />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Do you have a property to sell or rent in Barcelona?',
      }),
    ).toBeInTheDocument()

    const main = within(screen.getByRole('main'))
    expect(main.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Verified agency',
      'Professional support',
      'Secure video visits',
    ])
    // Inside main: the footer has a "List my property" link too, which leads to this page
    expect(main.getByRole('link', { name: 'List my property' })).toHaveAttribute(
      'href',
      '/list-property/form',
    )
  })
})
