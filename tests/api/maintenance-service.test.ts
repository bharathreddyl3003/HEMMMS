// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTx, mockPrisma, mockGetSession } = vi.hoisted(() => {
  const tx = {
    machine: { findUnique: vi.fn(), update: vi.fn() },
    scheduledMaintenance: { upsert: vi.fn(), update: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    maintenanceRecord: { create: vi.fn() },
    sparePart: { findUnique: vi.fn(), update: vi.fn() },
  }
  return {
    mockTx: tx,
    mockPrisma: {
      $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
      machine: { findUnique: vi.fn() },
      scheduledMaintenance: { findMany: vi.fn(), createMany: vi.fn() },
      maintenanceRecord: { findMany: vi.fn() },
    },
    mockGetSession: vi.fn(),
  }
})

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }))
vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }))

import { POST as completeServicePost } from '@/app/api/machines/[id]/complete-service/route'
import { GET as schedGet, PATCH as schedPatch } from '@/app/api/machines/[id]/scheduled-maintenance/route'
import { GET as completionsGet } from '@/app/api/maintenance/completions/route'
import { POST as maintenancePost } from '@/app/api/maintenance/route'

describe('Maintenance, Service Completion & Export API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (cb: (client: typeof mockTx) => unknown) => cb(mockTx))
  })

  describe('POST /api/machines/[id]/complete-service', () => {
    it('completes service, deducts spare parts atomically, and returns lowStockAlerts', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockTx.machine.findUnique.mockResolvedValue({ id: 'm1', name: 'T2', runningHours: 33200 })
      mockTx.sparePart.findUnique.mockResolvedValue({
        id: 'sp1',
        name: 'Engine Lube Filter',
        partNumber: 'LF-9009',
        stockQuantity: 4,
        reorderLevel: 3,
      })
      mockTx.sparePart.update.mockResolvedValue({
        id: 'sp1',
        name: 'Engine Lube Filter',
        partNumber: 'LF-9009',
        stockQuantity: 2,
        reorderLevel: 3,
      })
      mockTx.scheduledMaintenance.upsert.mockResolvedValue({ id: 'sm1', lastMaintenanceHmr: 33205, intervalHrs: 500 })
      mockTx.machine.update.mockResolvedValue({ id: 'm1', runningHours: 33205, status: 'Working' })
      mockTx.maintenanceRecord.create.mockResolvedValue({ id: 'rec1', performedBy: 'Asari Mahesh' })

      const res = await completeServicePost(
        new Request('http://localhost/api/machines/m1/complete-service', {
          method: 'POST',
          body: JSON.stringify({
            fitterName: ' Asari Mahesh ',
            serviceHmr: 33205,
            interval: 500,
            deductedParts: [{ sparePartId: 'sp1', quantity: 2 }],
            partsUsed: 'Cotton waste',
          }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )

      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.success).toBe(true)
      expect(json.lowStockAlerts).toHaveLength(1)
      expect(json.lowStockAlerts[0].stockQuantity).toBe(2)
      expect(mockTx.maintenanceRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            performedBy: 'Asari Mahesh',
            partsUsed: 'Engine Lube Filter [LF-9009] x2, Cotton waste',
            status: 'Completed',
          }),
        })
      )
    })

    it('rejects unauthenticated (401), forbidden (403), and invalid inputs (400)', async () => {
      mockGetSession.mockResolvedValue(null)
      expect(
        (
          await completeServicePost(
            new Request('http://localhost/api/machines/m1/complete-service', {
              method: 'POST',
              body: JSON.stringify({ fitterName: 'Raj', serviceHmr: 100 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(401)

      mockGetSession.mockResolvedValue({ role: 'USER', permissions: {} })
      expect(
        (
          await completeServicePost(
            new Request('http://localhost/api/machines/m1/complete-service', {
              method: 'POST',
              body: JSON.stringify({ fitterName: 'Raj', serviceHmr: 100 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(403)

      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      // Empty fitter name
      expect(
        (
          await completeServicePost(
            new Request('http://localhost/api/machines/m1/complete-service', {
              method: 'POST',
              body: JSON.stringify({ fitterName: '  ', serviceHmr: 100 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(400)

      // Negative serviceHmr
      expect(
        (
          await completeServicePost(
            new Request('http://localhost/api/machines/m1/complete-service', {
              method: 'POST',
              body: JSON.stringify({ fitterName: 'Raj', serviceHmr: -10 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(400)

      // Invalid interval
      expect(
        (
          await completeServicePost(
            new Request('http://localhost/api/machines/m1/complete-service', {
              method: 'POST',
              body: JSON.stringify({ fitterName: 'Raj', serviceHmr: 100, interval: 0 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(400)
    })

    it('returns 404 when machine not found and 400 on insufficient spare stock', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockTx.machine.findUnique.mockResolvedValue(null)

      const notFoundRes = await completeServicePost(
        new Request('http://localhost/api/machines/missing/complete-service', {
          method: 'POST',
          body: JSON.stringify({ fitterName: 'Raj', serviceHmr: 100 }),
        }),
        { params: Promise.resolve({ id: 'missing' }) }
      )
      expect(notFoundRes.status).toBe(404)

      mockTx.machine.findUnique.mockResolvedValue({ id: 'm1', runningHours: 100 })
      mockTx.sparePart.findUnique.mockResolvedValue({
        id: 'sp1',
        name: 'Filter',
        partNumber: 'F-1',
        stockQuantity: 1,
        reorderLevel: 1,
      })

      const insuffRes = await completeServicePost(
        new Request('http://localhost/api/machines/m1/complete-service', {
          method: 'POST',
          body: JSON.stringify({
            fitterName: 'Raj',
            serviceHmr: 100,
            deductedParts: [{ sparePartId: 'sp1', quantity: 5 }],
          }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )
      expect(insuffRes.status).toBe(400)
      expect((await insuffRes.json()).error).toContain('Insufficient stock')
    })
  })

  describe('GET/PATCH /api/machines/[id]/scheduled-maintenance', () => {
    it('provisions shovel defaults (no Compressor) when none exist', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockPrisma.scheduledMaintenance.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { type: 'Engine', intervalHrs: 250 },
          { type: 'Hydraulic', intervalHrs: 1000 },
        ])
      mockPrisma.machine.findUnique.mockResolvedValue({ category: 'Shovel', runningHours: 6700 })
      mockPrisma.scheduledMaintenance.createMany.mockResolvedValue({ count: 2 })

      const res = await schedGet(new Request('http://localhost/api/machines/b1/scheduled-maintenance'), {
        params: Promise.resolve({ id: 'b1' }),
      })

      expect(res.status).toBe(200)
      const created = mockPrisma.scheduledMaintenance.createMany.mock.calls[0][0].data
      expect(created.map((c: { type: string }) => c.type)).toEqual(['Engine', 'Hydraulic'])
    })

    it('validates schedule type and HMR on PATCH and maps P2025 to 404', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      const badTypeRes = await schedPatch(
        new Request('http://localhost/api/machines/m1/scheduled-maintenance', {
          method: 'PATCH',
          body: JSON.stringify({ type: 'Turbo', lastMaintenanceHmr: 100 }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )
      expect(badTypeRes.status).toBe(400)

      mockTx.scheduledMaintenance.update.mockRejectedValue({ code: 'P2025' })
      const missingRes = await schedPatch(
        new Request('http://localhost/api/machines/m1/scheduled-maintenance', {
          method: 'PATCH',
          body: JSON.stringify({ type: 'Engine', lastMaintenanceHmr: 100 }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )
      expect(missingRes.status).toBe(404)
    })
  })

  describe('GET /api/maintenance/completions', () => {
    it('requires auth and filters by category query parameter', async () => {
      mockGetSession.mockResolvedValue(null)
      expect((await completionsGet(new Request('http://localhost/api/maintenance/completions'))).status).toBe(401)

      mockGetSession.mockResolvedValue({ role: 'USER' })
      mockPrisma.maintenanceRecord.findMany.mockResolvedValue([{ id: 'r1' }])

      const res = await completionsGet(
        new Request('http://localhost/api/maintenance/completions?category=Shovel')
      )
      expect(res.status).toBe(200)
      expect(mockPrisma.maintenanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            machine: { category: 'Shovel' },
          }),
        })
      )
    })
  })

  describe('GET/POST /api/maintenance', () => {
    it('validates maintenance POST fields', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      const invalidRes = await maintenancePost(
        new Request('http://localhost/api/maintenance', {
          method: 'POST',
          body: JSON.stringify({ machineId: 'm1', description: '' }),
        })
      )
      expect(invalidRes.status).toBe(400)

      const negCostRes = await maintenancePost(
        new Request('http://localhost/api/maintenance', {
          method: 'POST',
          body: JSON.stringify({ machineId: 'm1', description: 'Oil change', cost: -50 }),
        })
      )
      expect(negCostRes.status).toBe(400)
    })
  })
})
