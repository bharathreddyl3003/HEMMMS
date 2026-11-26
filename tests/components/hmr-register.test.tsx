import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import HmrRegisterTable, { MachineWithSchedule } from '@/components/HmrRegisterTable'
import MaintenanceCompletionRegistry from '@/components/MaintenanceCompletionRegistry'

const SAMPLE_SHOVELS: MachineWithSchedule[] = [
  {
    id: 'm-t2',
    name: 'T2',
    model: 'EX1200',
    category: 'Shovel',
    capacity: '5 m³',
    runningHours: 33205,
    scheduledMaintenances: [
      { id: 's1', type: 'Engine', intervalHrs: 500, lastMaintenanceHmr: 32822, lastMaintenanceDate: '2026-11-01' },
    ],
  },
  {
    id: 'm-s2',
    name: 'S2',
    model: 'EX200',
    category: 'Shovel',
    capacity: '1 m³',
    runningHours: 19260,
    scheduledMaintenances: [
      { id: 's2', type: 'Engine', intervalHrs: 500, lastMaintenanceHmr: 18690, lastMaintenanceDate: '2026-10-15' },
    ],
  },
  {
    id: 'm-b9',
    name: 'B9',
    model: 'BE1000',
    category: 'Shovel',
    capacity: '6.5 m³',
    runningHours: 100,
    scheduledMaintenances: [], // Not configured
  },
]

const SAMPLE_SPARES = [
  { id: 'sp-1', name: 'Engine Lube Filter', partNumber: 'LF-9009', stockQuantity: 4, reorderLevel: 3 },
  { id: 'sp-2', name: 'Fuel Filter', partNumber: 'FF-200', stockQuantity: 0, reorderLevel: 2 },
]

describe('HmrRegisterTable & Closed-Loop Spares UI Integration', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('computes Used Hrs and Hours Due live, filters rows, and debounces HMR auto-save', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, runningHours: 33210 }),
    })

    render(
      <HmrRegisterTable
        machines={SAMPLE_SHOVELS}
        activeModule="shovels"
        canEdit={true}
        spareParts={SAMPLE_SPARES}
      />
    )

    // Verify initial KPI & formula outputs
    expect(screen.getByText('383.00')).toBeInTheDocument() // 33205 - 32822
    expect(screen.getByText('117.00 hrs left')).toBeInTheDocument()
    expect(screen.getByText('70.00 overdue')).toBeInTheDocument()
    expect(screen.getAllByText('Not configured').length).toBeGreaterThanOrEqual(1)

    // Filter to Due or overdue -> only S2 visible
    fireEvent.click(screen.getByRole('button', { name: /Due or overdue/i }))
    expect(screen.getByText('S2')).toBeInTheDocument()
    expect(screen.queryByText('T2')).not.toBeInTheDocument()

    // Reset filter & test live HMR auto-save on T2
    fireEvent.click(screen.getByRole('button', { name: /Show All/i }))
    const t2Input = screen.getByLabelText('Current HMR for T2')
    fireEvent.change(t2Input, { target: { value: '33210' } })

    // Live UI recalculates immediately
    expect(screen.getByText('388.00')).toBeInTheDocument()
    expect(screen.getByText('112.00 hrs left')).toBeInTheDocument()

    // Advance past 600ms debounce to fire PATCH
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/machines/m-t2/hmr',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ runningHours: 33210 }),
      })
    )
    expect(screen.getByText('✓ Auto-saved')).toBeInTheDocument()
  })

  it('shows save error indicator when HMR auto-save fails', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    render(
      <HmrRegisterTable
        machines={[SAMPLE_SHOVELS[0]]}
        activeModule="shovels"
        canEdit={true}
        spareParts={SAMPLE_SPARES}
      />
    )

    fireEvent.change(screen.getByLabelText('Current HMR for T2'), { target: { value: '33220' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650)
    })

    expect(screen.getByText('⚠ Save failed')).toBeInTheDocument()
  })

  it('completes service with spare part deduction, triggers LowStockAlertModal, and creates a PR', async () => {
    vi.useRealTimers()

    fetchMock
      // 1st call: POST /api/machines/m-s2/complete-service
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lowStockAlerts: [
            {
              id: 'sp-1',
              name: 'Engine Lube Filter',
              partNumber: 'LF-9009',
              stockQuantity: 2,
              reorderLevel: 3,
              suggestedOrderQty: 4,
            },
          ],
        }),
      })
      // 2nd call: POST /api/requisitions (from LowStockAlertModal)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'pr-1', status: 'Pending' }),
      })

    const onCompletionAdded = vi.fn()
    render(
      <HmrRegisterTable
        machines={[SAMPLE_SHOVELS[1]]}
        activeModule="shovels"
        canEdit={true}
        spareParts={SAMPLE_SPARES}
        onCompletionAdded={onCompletionAdded}
      />
    )

    // Open service completion modal for S2
    fireEvent.click(screen.getByRole('button', { name: /Pending/i }))
    expect(screen.getByText(/Record Service Completion — S2/i)).toBeInTheDocument()

    // Select spare part LF-9009 x2 (drops 4 -> 2 <= reorderLevel 3)
    const spareSelect = screen.getByLabelText('Select spare part from inventory')
    fireEvent.change(spareSelect, { target: { value: 'sp-1' } })
    const qtyInput = screen.getByTitle('Quantity used')
    fireEvent.change(qtyInput, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))

    expect(screen.getByText(/⚠ Low Stock ≤ 3/i)).toBeInTheDocument()

    // Submit completion
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Mark Service Completed/i }))
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/machines/m-s2/complete-service',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"sparePartId":"sp-1","quantity":2'),
      })
    )
    expect(onCompletionAdded).toHaveBeenCalled()

    // LowStockAlertModal opens with 1-click Generate PR button
    expect(screen.getByText(/Low Stock Alert — Purchase Requisition Needed/i)).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /\+ Generate PR/i }))
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/requisitions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"sparePartId":"sp-1","quantity":4'),
      })
    )
    expect(screen.getByText('✓ PR Created')).toBeInTheDocument()
  })

  it('filters MaintenanceCompletionRegistry in memory by category without extra fetch on mount', async () => {
    vi.useRealTimers()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ records: [] }),
    })

    const records = [
      {
        id: 'r1',
        createdAt: '2026-11-24T08:30:00.000Z',
        description: 'Engine 500h',
        hmr: 33205,
        status: 'Completed',
        performedBy: 'Asari Mahesh',
        partsUsed: 'Engine Lube Filter [LF-9009] x2',
        machine: {
          id: 'm1',
          name: 'T2',
          model: 'EX1200',
          category: 'Shovel',
          scheduledMaintenances: [{ type: 'Engine', intervalHrs: 500, lastMaintenanceHmr: 33205 }],
        },
      },
      {
        id: 'r2',
        createdAt: '2026-11-23T10:00:00.000Z',
        description: 'Engine 250h',
        hmr: 29595,
        status: 'Completed',
        performedBy: 'Raj kumar',
        machine: {
          id: 'm2',
          name: 'DM11',
          model: 'IDM30',
          category: 'Drill',
          scheduledMaintenances: [{ type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: 29595 }],
        },
      },
    ]

    const { rerender } = render(
      <MaintenanceCompletionRegistry initialRecords={records} category="Shovel" refreshTrigger={0} />
    )

    expect(screen.getByText('T2')).toBeInTheDocument()
    expect(screen.getByText('AM')).toBeInTheDocument()
    expect(screen.getByText(/Engine Lube Filter/i)).toBeInTheDocument()
    expect(screen.queryByText('DM11')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    // Switch category in memory -> 0 fetches, DM11 appears
    rerender(<MaintenanceCompletionRegistry initialRecords={records} category="Drill" refreshTrigger={0} />)
    expect(screen.getByText('DM11')).toBeInTheDocument()
    expect(screen.queryByText('T2')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    // Manual refresh triggers API call
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Refresh registry/i }))
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/maintenance/completions')
  })
})
