// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockGetSession } = vi.hoisted(() => ({
  mockPrisma: {
    sparePart: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
import { PATCH as sparePatch } from '@/app/api/spares/[id]/route'
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

    it('PATCH /api/spares/[id] enforces permissions, validates stock bounds, and supports restock adjustment', async () => {
      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditSpares: false } })
      const forbiddenRes = await sparePatch(
        new Request('http://localhost/api/spares/sp1', {
          method: 'PATCH',
          body: JSON.stringify({ adjustment: 5 }),
        }),
        { params: Promise.resolve({ id: 'sp1' }) }
      )
      expect(forbiddenRes.status).toBe(403)

      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditSpares: true } })

      // Missing body fields -> 400
      const emptyRes = await sparePatch(
        new Request('http://localhost/api/spares/sp1', {
          method: 'PATCH',
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ id: 'sp1' }) }
      )
      expect(emptyRes.status).toBe(400)

      // Missing spare -> 404
      mockPrisma.sparePart.findUnique.mockResolvedValueOnce(null)
      const missingRes = await sparePatch(
        new Request('http://localhost/api/spares/missing', {
          method: 'PATCH',
          body: JSON.stringify({ adjustment: 5 }),
        }),
        { params: Promise.resolve({ id: 'missing' }) }
      )
      expect(missingRes.status).toBe(404)

      // Adjustment below zero -> 400
      mockPrisma.sparePart.findUnique.mockResolvedValueOnce({ id: 'sp1', stockQuantity: 2, reorderLevel: 3 })
      const belowZeroRes = await sparePatch(
        new Request('http://localhost/api/spares/sp1', {
          method: 'PATCH',
          body: JSON.stringify({ adjustment: -5 }),
        }),
        { params: Promise.resolve({ id: 'sp1' }) }
      )
      expect(belowZeroRes.status).toBe(400)

      // Valid absolute stockQuantity + reorderLevel update
      mockPrisma.sparePart.findUnique.mockResolvedValueOnce({ id: 'sp1', stockQuantity: 2, reorderLevel: 3 })
      mockPrisma.sparePart.update.mockResolvedValueOnce({ id: 'sp1', stockQuantity: 12, reorderLevel: 4 })
      const okRes = await sparePatch(
        new Request('http://localhost/api/spares/sp1', {
          method: 'PATCH',
          body: JSON.stringify({ stockQuantity: 12, reorderLevel: 4 }),
        }),
        { params: Promise.resolve({ id: 'sp1' }) }
      )
      expect(okRes.status).toBe(200)
      expect(await okRes.json()).toEqual({ id: 'sp1', stockQuantity: 12, reorderLevel: 4 })
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
