// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as bcrypt from 'bcryptjs'

const { mockPrisma, mockCookieSet, mockRedirect } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
  mockCookieSet: vi.fn(),
  mockRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }))
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({ set: mockCookieSet })),
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))

import { loginUser } from '@/app/login/actions'

describe('Server Action: loginUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns error when username or password is missing', async () => {
    const fd = new FormData()
    fd.set('username', 'admin')
    expect(await loginUser(null, fd)).toEqual({ error: 'Please enter both username and password' })
  })

  it('blocks login when password is incorrect (including legacy admin123 bypass check)', async () => {
    const hash = await bcrypt.hash('userRealPass', 4)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      username: 'user',
      password: hash,
      role: 'USER',
    })

    const fd = new FormData()
    fd.set('username', 'user')
    fd.set('password', 'admin123')

    expect(await loginUser(null, fd)).toEqual({ error: 'Invalid credentials' })
    expect(mockCookieSet).not.toHaveBeenCalled()
  })

  it('sets session cookie and redirects to / on valid login', async () => {
    const hash = await bcrypt.hash('pass123', 4)
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'admin',
      password: hash,
      role: 'ADMIN',
      canEditMachines: true,
      canEditSpares: true,
      canManageMaintenance: true,
      canManagePRs: true,
      canManageScheduledMaintenance: true,
    })

    const fd = new FormData()
    fd.set('username', 'admin')
    fd.set('password', 'pass123')

    await expect(loginUser(null, fd)).rejects.toThrow('NEXT_REDIRECT')
    expect(mockCookieSet).toHaveBeenCalledWith(
      'session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    )
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
