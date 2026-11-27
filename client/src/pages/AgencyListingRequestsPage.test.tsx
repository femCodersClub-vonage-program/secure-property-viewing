import { fireEvent, render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../routes'

afterEach(() => {
  vi.unstubAllGlobals()
})

const agent = { name: 'Marta', role: 'AGENT' }

// The agency pages check the session first. D2 and D3 read the sample data, which mirrors the
// server seed, so only the session is faked here and every other call never answers
const signedInFetch = () =>
  vi.fn<typeof fetch>((input) =>
    String(input) === '/api/agency/session'
      ? Promise.resolve(
          new Response(JSON.stringify(agent), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        )
      : new Promise(() => {}),
  )

describe('listing request screens in the app', () => {
  // Through the real routes, so the test fails if D2 or D3 stop being plugged into the app
  it('opens a request from the list, approves it and finds it in the Approved tab', async () => {
    vi.stubGlobal('fetch', signedInFetch())
    const router = createMemoryRouter(routes, { initialEntries: ['/agency/listing-requests'] })
    render(<RouterProvider router={router} />)

    const pendingTable = await screen.findByRole('table', { name: 'Pending requests' })
    fireEvent.click(
      within(pendingTable).getByRole('link', { name: 'Bright flat near Plaça del Sol' }),
    )

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bright flat near Plaça del Sol' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Approve and publish' }))
    expect(await screen.findByText('Request approved and published.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Back to listing requests' }))

    const approvedTable = await screen.findByRole('table', { name: 'Approved requests' })
    expect(
      within(approvedTable).getByRole('link', { name: 'Bright flat near Plaça del Sol' }),
    ).toBeInTheDocument()
  })
})
