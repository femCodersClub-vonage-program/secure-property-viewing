import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('renders with its label', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('is disabled when the disabled prop is set', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('is disabled and marks aria-busy when loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('is disabled when loading even if disabled is explicitly false', () => {
    render(
      <Button disabled={false} loading>
        Send
      </Button>,
    )
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled()
  })

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Cancel</Button>)
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('underlines the link variant, so it does not rely on color alone', () => {
    render(<Button variant="link">Change the number</Button>)
    expect(screen.getByRole('button', { name: 'Change the number' })).toHaveClass('underline')
  })

  it('keeps the rounded corners and padding of every button by default', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('rounded-md', 'px-5')
  })

  it('draws a circle without padding, so it fits a calendar day', () => {
    render(<Button shape="circle">19</Button>)
    const day = screen.getByRole('button', { name: '19' })
    expect(day).toHaveClass('rounded-pill', 'aspect-square', 'p-0')
    expect(day).not.toHaveClass('rounded-md', 'px-5')
  })

  it('draws a pill that keeps the padding, for a time', () => {
    render(<Button shape="pill">11:30</Button>)
    expect(screen.getByRole('button', { name: '11:30' })).toHaveClass('rounded-pill', 'px-5')
  })

  it('renders danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})
