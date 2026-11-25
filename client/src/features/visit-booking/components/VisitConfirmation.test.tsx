import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import VisitBookedHeader from './VisitBookedHeader'
import VisitConfirmation from './VisitConfirmation'

// Shaped as in specs/visit-booking.md, "API": response 201 of POST /api/visits. It comes in UTC
// here, to check that the day and time are shown in Madrid time
const bookedFromSpec = {
  visitId: 18,
  startsAt: '2026-11-23T10:00:00Z',
  endsAt: '2026-11-23T10:30:00Z',
  visitorName: 'Laura Gómez',
  property: {
    title: 'Bright apartment in Gràcia',
    area: 'Gràcia',
    address: 'Fictional demo address 01, Barcelona',
  },
}

describe('VisitConfirmation', () => {
  it('shows the property, its full address, the day and the time in Madrid time', () => {
    render(<VisitConfirmation visit={bookedFromSpec} />)

    expect(screen.getByText('Bright apartment in Gràcia')).toBeInTheDocument()
    expect(screen.getByText('Gràcia')).toBeInTheDocument()
    expect(screen.getByText('Fictional demo address 01, Barcelona')).toBeInTheDocument()
    expect(screen.getByText('Monday 23 November')).toBeInTheDocument()
    expect(screen.getByText('11:00 to 11:30, Madrid time')).toBeInTheDocument()
  })

  it('shows the photo of the property when the calendar passed it on', () => {
    render(
      <VisitConfirmation
        visit={bookedFromSpec}
        photo={{ url: '/properties/property-01-cover.webp', altText: 'Bright bedroom' }}
      />,
    )

    expect(screen.getByRole('img', { name: 'Bright bedroom' })).toHaveAttribute(
      'src',
      '/properties/property-01-cover.webp',
    )
  })

  it('shows the visit without a photo when there is none', () => {
    render(<VisitConfirmation visit={bookedFromSpec} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Bright apartment in Gràcia')).toBeInTheDocument()
  })

  it('thanks the visitor by name and moves the focus to the heading', () => {
    render(<VisitBookedHeader visitorName="Laura Gómez" />)

    const heading = screen.getByRole('heading', { level: 1, name: 'Your video visit is booked' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('Thank you, Laura Gómez.')).toBeInTheDocument()
  })

  it('tells the visitor about the safety call after the visit', () => {
    render(<VisitConfirmation visit={bookedFromSpec} />)

    expect(
      screen.getByText('Peephole will call you with one safety question. Answer with your keypad.'),
    ).toBeInTheDocument()
  })

  it('does not mention the SMS confirmation until the messages feature sends it', () => {
    render(<VisitConfirmation visit={bookedFromSpec} />)

    expect(screen.queryByText(/SMS/)).not.toBeInTheDocument()
  })
})
