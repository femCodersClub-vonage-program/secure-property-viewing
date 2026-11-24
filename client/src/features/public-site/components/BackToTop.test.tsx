import { fireEvent, render, screen } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BackToTop from './BackToTop'

function Page() {
  const topRef = useRef<HTMLDivElement>(null)
  return (
    <>
      <div ref={topRef} tabIndex={-1} data-testid="top" />
      <BackToTop topRef={topRef} />
    </>
  )
}

function scrollPageTo(y: number) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true })
  fireEvent.scroll(window)
}

const button = () => screen.queryByRole('button', { name: 'Back to top' })

afterEach(() => {
  Reflect.deleteProperty(window, 'scrollY')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('BackToTop', () => {
  it('appears after a whole screen and disappears back at the top', () => {
    render(<Page />)
    expect(button()).not.toBeInTheDocument()

    scrollPageTo(window.innerHeight)
    expect(button()).not.toBeInTheDocument()

    scrollPageTo(window.innerHeight + 1)
    expect(button()).toBeInTheDocument()

    scrollPageTo(0)
    expect(button()).not.toBeInTheDocument()
  })

  it('goes to the top smoothly and takes the focus there', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockReturnValue(undefined)
    render(<Page />)
    scrollPageTo(5000)

    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(screen.getByTestId('top')).toHaveFocus()
  })

  it('jumps without animation for people who prefer less motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    )
    const scrollTo = vi.spyOn(window, 'scrollTo').mockReturnValue(undefined)
    render(<Page />)
    scrollPageTo(5000)

    fireEvent.click(screen.getByRole('button', { name: 'Back to top' }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
  })
})
