import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RequestStatus from './RequestStatus'

describe('RequestStatus', () => {
  it.each([
    ['PENDING', 'Pending'],
    ['APPROVED', 'Approved'],
    ['REJECTED', 'Rejected'],
  ] as const)('shows %s as text', (status, label) => {
    render(<RequestStatus status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
