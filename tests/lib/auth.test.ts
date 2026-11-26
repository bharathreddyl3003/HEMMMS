// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCookieGet = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}))

import { encrypt, decrypt, getSession, requireAuth } from '@/lib/auth'

describe('lib/auth', () => {
  beforeEach(() => {
    mockCookieGet.mockReset()
  })

  it('encrypts and decrypts a valid session payload', async () => {
    const payload = {
      userId: 'user-1',
      username: 'admin',
      role: 'ADMIN',
      permissions: { canEditMachines: true },
    }

    const token = await encrypt(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)

    const decoded = await decrypt(token)
    expect(decoded.userId).toBe('user-1')
    expect(decoded.username).toBe('admin')
    expect(decoded.role).toBe('ADMIN')
    expect(decoded.permissions).toEqual({ canEditMachines: true })
  })

  it('throws when decrypting malformed or tampered tokens', async () => {
    await expect(decrypt('not-a-jwt')).rejects.toThrow()

    const token = await encrypt({ userId: 'u1' })
    const tampered = token.slice(0, -4) + 'xxxx'
    await expect(decrypt(tampered)).rejects.toThrow()
  })

  it('returns null from getSession and requireAuth when session cookie is missing', async () => {
    mockCookieGet.mockReturnValue(undefined)

    expect(await getSession()).toBeNull()
    expect(await requireAuth()).toBeNull()
  })

  it('returns null from getSession when cookie contains an invalid JWT', async () => {
    mockCookieGet.mockReturnValue({ value: 'corrupted.jwt.token' })

    expect(await getSession()).toBeNull()
    expect(await requireAuth()).toBeNull()
  })

  it('returns decoded payload from getSession and requireAuth when cookie is valid', async () => {
    const token = await encrypt({ userId: 'u2', username: 'operator', role: 'USER' })
    mockCookieGet.mockReturnValue({ value: token })

    const session = await getSession()
    expect(session).not.toBeNull()
    expect(session.username).toBe('operator')

    const authed = await requireAuth()
    expect(authed?.userId).toBe('u2')
  })
})
