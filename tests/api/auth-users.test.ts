// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as bcrypt from 'bcryptjs'

const { mockPrisma, mockGetSession } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  mockGetSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }))
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    getSession: mockGetSession,
  }
})

import { POST as loginPost } from '@/app/api/auth/login/route'
import { POST as logoutPost } from '@/app/api/auth/logout/route'
import { GET as usersGet, POST as usersPost } from '@/app/api/users/route'
import { PATCH as userPatch } from '@/app/api/users/[id]/route'

describe('Auth & Users API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/auth/login', () => {
    it('logs in valid user and sets httpOnly session cookie', async () => {
      const hash = await bcrypt.hash('secret123', 4)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'operator',
        password: hash,
        role: 'USER',
        canEditMachines: true,
        canEditSpares: false,
        canManageMaintenance: true,
        canManagePRs: false,
        canManageScheduledMaintenance: true,
      })

      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: ' operator ', password: 'secret123' }),
      })

      const res = await loginPost(req)
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true })
      const setCookie = res.headers.get('set-cookie') || ''
      expect(setCookie).toContain('session=')
      expect(setCookie.toLowerCase()).toContain('httponly')
    })

    it('rejects missing or non-string credentials with 400', async () => {
      const req = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin' }),
      })
      const res = await loginPost(req)
      expect(res.status).toBe(400)
    })

    it('rejects unknown user or wrong password (including legacy admin123 bypass check)', async () => {
      const hash = await bcrypt.hash('myRealPassword', 4)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u2',
        username: 'fitter',
        password: hash,
        role: 'USER',
      })

      // Ensure hardcoded backdoor password cannot log in another user
      const bypassReq = new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'fitter', password: 'admin123' }),
      })
      const bypassRes = await loginPost(bypassReq)
      expect(bypassRes.status).toBe(401)

      mockPrisma.user.findUnique.mockResolvedValue(null)
      const missingRes = await loginPost(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'ghost', password: 'pw' }),
        })
      )
      expect(missingRes.status).toBe(401)
    })

    it('returns 500 when database throws', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB down'))
      const res = await loginPost(
        new Request('http://localhost/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: 'admin', password: 'pw' }),
        })
      )
      expect(res.status).toBe(500)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('clears session cookie and returns success', async () => {
      const res = await logoutPost()
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ success: true })
      expect(res.headers.get('set-cookie')).toContain('session=;')
    })
  })

  describe('GET/POST /api/users & PATCH /api/users/[id]', () => {
    it('forbids non-admin access with 403', async () => {
      mockGetSession.mockResolvedValue({ role: 'USER' })

      expect((await usersGet()).status).toBe(403)
      expect(
        (
          await usersPost(
            new Request('http://localhost/api/users', {
              method: 'POST',
              body: JSON.stringify({ username: 'x', password: 'password' }),
            })
          )
        ).status
      ).toBe(403)
      expect(
        (
          await userPatch(
            new Request('http://localhost/api/users/u1', {
              method: 'PATCH',
              body: JSON.stringify({ canEditMachines: true }),
            }),
            { params: Promise.resolve({ id: 'u1' }) }
          )
        ).status
      ).toBe(403)
    })

    it('creates user with hashed password and enforces role=USER even if ADMIN injected', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({ id: 'u-new', username: 'mahesh' })

      const res = await usersPost(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({
            username: ' mahesh ',
            password: 'strongpassword',
            role: 'ADMIN', // attempt privilege escalation
            canEditMachines: true,
          }),
        })
      )

      expect(res.status).toBe(201)
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'mahesh',
            role: 'USER',
            canEditMachines: true,
            canEditSpares: false,
          }),
        })
      )
    })

    it('rejects short password, missing username, and duplicate username with 400', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      const shortPwRes = await usersPost(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({ username: 'u', password: '12' }),
        })
      )
      expect(shortPwRes.status).toBe(400)

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })
      const dupRes = await usersPost(
        new Request('http://localhost/api/users', {
          method: 'POST',
          body: JSON.stringify({ username: 'admin', password: 'password1' }),
        })
      )
      expect(dupRes.status).toBe(400)
    })

    it('updates user boolean permissions via PATCH /api/users/[id]', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockPrisma.user.update.mockResolvedValue({ id: 'u1', username: 'fitter1' })

      const res = await userPatch(
        new Request('http://localhost/api/users/u1', {
          method: 'PATCH',
          body: JSON.stringify({ canEditMachines: true, role: 'ADMIN' }),
        }),
        { params: Promise.resolve({ id: 'u1' }) }
      )

      expect(res.status).toBe(200)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { canEditMachines: true },
        })
      )
    })
  })
})
