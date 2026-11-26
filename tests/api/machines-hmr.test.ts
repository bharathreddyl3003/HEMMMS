// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma, mockGetSession } = vi.hoisted(() => ({
  mockPrisma: {
    machine: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
  mockGetSession: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ default: mockPrisma }))
vi.mock('@/lib/auth', () => ({ getSession: mockGetSession }))

import { GET as machinesGet, POST as machinesPost } from '@/app/api/machines/route'
import { GET as machineGet, PATCH as machinePatch, DELETE as machineDelete } from '@/app/api/machines/[id]/route'
import { PATCH as hmrPatch } from '@/app/api/machines/[id]/hmr/route'

describe('Machines & HMR API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET/POST /api/machines', () => {
    it('rejects unauthenticated GET with 401 and unauthorized POST with 403', async () => {
      mockGetSession.mockResolvedValue(null)
      expect((await machinesGet()).status).toBe(401)

      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditMachines: false } })
      const postRes = await machinesPost(
        new Request('http://localhost/api/machines', {
          method: 'POST',
          body: JSON.stringify({ name: 'T7', model: 'EX1200' }),
        })
      )
      expect(postRes.status).toBe(403)
    })

    it('creates a Shovel WITHOUT compressor maintenance and with 5 shovel subassemblies', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockPrisma.machine.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'm-shovel',
        ...data,
      }))

      const res = await machinesPost(
        new Request('http://localhost/api/machines', {
          method: 'POST',
          body: JSON.stringify({
            name: 'B4',
            model: 'BE1000-1',
            category: 'Shovel',
            capacity: '6.5 Cu.M',
            runningHours: 500,
          }),
        })
      )

      expect(res.status).toBe(200)
      const createdCall = mockPrisma.machine.create.mock.calls[0][0].data
      expect(createdCall.category).toBe('Shovel')
      expect(createdCall.subassemblies.create).toHaveLength(5)
      const scheduleTypes = createdCall.scheduledMaintenances.create.map((s: { type: string }) => s.type)
      expect(scheduleTypes).toEqual(['Engine', 'Hydraulic'])
      expect(scheduleTypes).not.toContain('Compressor')
    })

    it('creates a Drill WITH Engine, Compressor, and Hydraulic maintenance schedules', async () => {
      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditMachines: true } })
      mockPrisma.machine.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'm-drill', ...data }))

      const res = await machinesPost(
        new Request('http://localhost/api/machines', {
          method: 'POST',
          body: JSON.stringify({
            name: 'DM17',
            model: 'IDM30',
            category: 'Drill',
            runningHours: 100,
          }),
        })
      )

      expect(res.status).toBe(200)
      const createdCall = mockPrisma.machine.create.mock.calls[0][0].data
      expect(createdCall.scheduledMaintenances.create.map((s: { type: string }) => s.type)).toEqual([
        'Engine',
        'Compressor',
        'Hydraulic',
      ])
    })

    it('validates missing name/model, negative runningHours, and invalid commissioningDate', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      expect(
        (
          await machinesPost(
            new Request('http://localhost/api/machines', {
              method: 'POST',
              body: JSON.stringify({ name: '', model: 'EX1200' }),
            })
          )
        ).status
      ).toBe(400)

      expect(
        (
          await machinesPost(
            new Request('http://localhost/api/machines', {
              method: 'POST',
              body: JSON.stringify({ name: 'T8', model: 'EX1200', runningHours: -5 }),
            })
          )
        ).status
      ).toBe(400)

      expect(
        (
          await machinesPost(
            new Request('http://localhost/api/machines', {
              method: 'POST',
              body: JSON.stringify({ name: 'T8', model: 'EX1200', commissioningDate: 'not-a-date' }),
            })
          )
        ).status
      ).toBe(400)
    })
  })

  describe('GET/PATCH/DELETE /api/machines/[id]', () => {
    it('handles missing machine (404), validation (400), and P2025 errors cleanly', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockPrisma.machine.findUnique.mockResolvedValue(null)
      expect(
        (await machineGet(new Request('http://localhost/api/machines/x'), { params: Promise.resolve({ id: 'x' }) })).status
      ).toBe(404)

      const badPatch = await machinePatch(
        new Request('http://localhost/api/machines/x', {
          method: 'PATCH',
          body: JSON.stringify({ runningHours: -10 }),
        }),
        { params: Promise.resolve({ id: 'x' }) }
      )
      expect(badPatch.status).toBe(400)

      mockPrisma.machine.delete.mockRejectedValue({ code: 'P2025' })
      const missingDelete = await machineDelete(
        new Request('http://localhost/api/machines/missing', { method: 'DELETE' }),
        { params: Promise.resolve({ id: 'missing' }) }
      )
      expect(missingDelete.status).toBe(404)
    })

    it('updates extended equipment details & customSpecs on PATCH and validates bounds', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      const badYearRes = await machinePatch(
        new Request('http://localhost/api/machines/m1', {
          method: 'PATCH',
          body: JSON.stringify({ manufactureYear: 1900 }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )
      expect(badYearRes.status).toBe(400)

      const badSpecRes = await machinePatch(
        new Request('http://localhost/api/machines/m1', {
          method: 'PATCH',
          body: JSON.stringify({ customSpecs: [{ label: 'Mast Length', value: '' }] }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )
      expect(badSpecRes.status).toBe(400)

      mockPrisma.machine.update.mockResolvedValueOnce({ id: 'm1', assetCode: 'RG2-SH-01' })
      const okRes = await machinePatch(
        new Request('http://localhost/api/machines/m1', {
          method: 'PATCH',
          body: JSON.stringify({
            assetCode: ' RG2-SH-01 ',
            manufactureYear: 2021,
            deploymentLocation: 'OB Bench 4',
            supervisorName: 'A. Sharma',
            powerSource: 'Diesel',
            engineDetails: 'Cummins QSK23 • 760 HP',
            operatingWeight: '118 Ton',
            fluidCapacities: 'Fuel 1400L • Hyd 680L',
            notes: 'Overhauled at 30k hrs',
            customSpecs: [{ label: 'Track Pad Width', value: '800 mm' }],
          }),
        }),
        { params: Promise.resolve({ id: 'm1' }) }
      )
      expect(okRes.status).toBe(200)
      const updateData = mockPrisma.machine.update.mock.calls[0][0].data
      expect(updateData.assetCode).toBe('RG2-SH-01')
      expect(updateData.manufactureYear).toBe(2021)
      expect(updateData.customSpecs).toEqual([{ label: 'Track Pad Width', value: '800 mm' }])
    })
  })

  describe('PATCH /api/machines/[id]/hmr', () => {
    it('updates machine HMR on valid payload', async () => {
      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditMachines: true } })
      mockPrisma.machine.update.mockResolvedValue({
        id: 'm-t2',
        name: 'T2',
        runningHours: 33250.5,
      })

      const res = await hmrPatch(
        new Request('http://localhost/api/machines/m-t2/hmr', {
          method: 'PATCH',
          body: JSON.stringify({ runningHours: '33250.5' }),
        }),
        { params: Promise.resolve({ id: 'm-t2' }) }
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({
        success: true,
        id: 'm-t2',
        name: 'T2',
        runningHours: 33250.5,
      })
    })

    it('returns 401 unauthenticated and 403 without edit permission', async () => {
      mockGetSession.mockResolvedValue(null)
      expect(
        (
          await hmrPatch(
            new Request('http://localhost/api/machines/m1/hmr', {
              method: 'PATCH',
              body: JSON.stringify({ runningHours: 100 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(401)

      mockGetSession.mockResolvedValue({ role: 'USER', permissions: { canEditMachines: false } })
      expect(
        (
          await hmrPatch(
            new Request('http://localhost/api/machines/m1/hmr', {
              method: 'PATCH',
              body: JSON.stringify({ runningHours: 100 }),
            }),
            { params: Promise.resolve({ id: 'm1' }) }
          )
        ).status
      ).toBe(403)
    })

    it('rejects negative, NaN, and Infinity HMR values with 400', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })

      for (const badVal of [-1, 'abc', null, 'Infinity']) {
        const res = await hmrPatch(
          new Request('http://localhost/api/machines/m1/hmr', {
            method: 'PATCH',
            body: JSON.stringify({ runningHours: badVal }),
          }),
          { params: Promise.resolve({ id: 'm1' }) }
        )
        expect(res.status).toBe(400)
      }
    })

    it('returns 404 when machine record is not found (P2025)', async () => {
      mockGetSession.mockResolvedValue({ role: 'ADMIN' })
      mockPrisma.machine.update.mockRejectedValue({ code: 'P2025' })

      const res = await hmrPatch(
        new Request('http://localhost/api/machines/missing/hmr', {
          method: 'PATCH',
          body: JSON.stringify({ runningHours: 200 }),
        }),
        { params: Promise.resolve({ id: 'missing' }) }
      )
      expect(res.status).toBe(404)
    })
  })
})
