import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// A busy machine needs more than the default second to render a whole page. A test that passes
// doesn't wait any longer
configure({ asyncUtilTimeout: 5000 })

afterEach(cleanup)

// jsdom has no layout, so it does not implement scrolling
window.scrollTo = () => undefined
