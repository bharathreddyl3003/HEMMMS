// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockGetSession } = vi.hoisted(() => ({
  mockPrisma: {
    sparePart: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    subassembly: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  mockGetSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }))
vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }))

import { GET as sparesGet, POST as sparesPost } from '@/app/api/spares/route'
import { POST as subCreate } from '@/app/api/subassemblies/route'
import { PATCH as subPatch, DELETE as subDelete } from '@/app/api/subassemblies/[id]/route'

describe('Inventory & Subassemblies API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('/api/spares', () => {
    it('enforces 401 on unauthenticated GET and 403 without canEditSpares', async () => {
      mockGetSession.mockResolvedValue(null)
      expect((await sparesGet()).status).toBe(401)

      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditSpares: false } })
      expect(
        (
          await sparesPost(
            new Request('http://localhost/api/spares', {
              method: 'POST',
              body: JSON.stringify({ name: 'Filter', partNumber: 'F-1' }),
            })
          )
        ).status
      ).toBe(403)
    })

    it('creates spare part cleanly and validates duplicate partNumber / negative stock', async () => {
      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditSpares: true } })
      mockPrisma.sparePart.create.mockResolvedValue({ id: 'sp1', name: 'Filter', partNumber: 'F-1' })

      const okRes = await sparesPost(
        new Request('http://localhost/api/spares', {
          method: 'POST',
          body: JSON.stringify({ name: ' Filter ', partNumber: ' F-1 ', stockQuantity: 10, reorderLevel: 2 }),
        })
      )
      expect(okRes.status).toBe(201)

      const negRes = await sparesPost(
        new Request('http://localhost/api/spares', {
          method: 'POST',
          body: JSON.stringify({ name: 'Filter', partNumber: 'F-2', stockQuantity: -1 }),
        })
      )
      expect(negRes.status).toBe(400)

      mockPrisma.sparePart.create.mockRejectedValue({ code: 'P2002' })
      const dupRes = await sparesPost(
        new Request('http://localhost/api/spares', {
          method: 'POST',
          body: JSON.stringify({ name: 'Filter', partNumber: 'F-1', stockQuantity: 5, reorderLevel: 1 }),
        })
      )
      expect(dupRes.status).toBe(400)
    })
  })

  describe('/api/subassemblies & /api/subassemblies/[id]', () => {
    it('validates lifeExpectancyHours > 0 on POST and whitelists fields on PATCH', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      const badPost = await subCreate(
        new Request('http://localhost/api/subassemblies', {
          method: 'POST',
          body: JSON.stringify({ machineId: 'm1', name: 'Boom', lifeExpectancyHours: 0 }),
        })
      )
      expect(badPost.status).toBe(400)

      mockPrisma.subassembly.update.mockResolvedValue({ id: 'sub1', healthStatus: 'Warning' })
      const patchRes = await subPatch(
        new Request('http://localhost/api/subassemblies/sub1', {
          method: 'PATCH',
          body: JSON.stringify({
            healthStatus: 'Warning',
            currentHours: 1200,
            machineId: 'hijack-attempt',
          }),
        }),
        { params: Promise.resolve({ id: 'sub1' }) }
      )
      expect(patchRes.status).toBe(200)
      expect(mockPrisma.subassembly.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { healthStatus: 'Warning', currentHours: 1200 },
        })
      )

      mockPrisma.subassembly.delete.mockRejectedValue({ code: 'P2025' })
      const delRes = await subDelete(
        new Request('http://localhost/api/subassemblies/missing', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'missing' }) }
      )
      expect(delRes.status).toBe(404)
    })
  })
})
