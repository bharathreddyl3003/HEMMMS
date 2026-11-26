import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Ensure React Testing Library unmounts cleanly between tests
afterEach(() => {
  cleanup()
})

// Polyfill native <dialog> methods in jsdom if missing
if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute('open', '')
    }
  }
  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
  }
}

// Default stub for Next.js navigation helpers in component tests
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))
