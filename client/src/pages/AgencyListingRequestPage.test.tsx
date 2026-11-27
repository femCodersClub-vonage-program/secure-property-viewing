import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'
import AgencyListingRequestPage from './AgencyListingRequestPage'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/agency/listing-requests/:id" element={<AgencyListingRequestPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AgencyListingRequestPage', () => {
  // The server answers 400 to an id it cannot read as a number, so the page never asks for these
  it.each(['abc', '1.5', '0', '-3', '99999999999999999999'])(
    'says the request %s does not exist, without asking for it',
    (id) => {
      renderAt(`/agency/listing-requests/${id}`)

      expect(screen.getByRole('heading', { level: 1, name: 'Request details' })).toBeInTheDocument()
      expect(screen.getByText('The listing request does not exist.')).toBeInTheDocument()
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    },
  )

  // With the real sample data, which mirrors the server seed: the request arrives after its short wait
  it('shows the request of the id in the address', async () => {
    renderAt('/agency/listing-requests/900001')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Bright flat near Plaça del Sol' }),
    ).toBeInTheDocument()
  })
})
