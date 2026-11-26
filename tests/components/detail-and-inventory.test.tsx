import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'

vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => {
    void prefetch
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

import MachineDetailView from '@/components/MachineDetailView'
import InventoryView from '@/components/InventoryView'

describe('MachineDetailView & InventoryView UI Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('MachineDetailView displays context breadcrumbs, unit switcher, and read-only scheduled maintenance', () => {
    const pushMock = vi.fn()
    vi.mocked(useRouter).mockReturnValue({
      push: pushMock,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>)

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MachineDetailView
        machine={{
          id: 'm1',
          name: 'T2',
          model: 'EX1200',
          category: 'Shovel',
          make: 'Tata Hitachi',
          capacity: '5 m³',
          type: 'Hydraulic Shovel',
          status: 'Working',
          runningHours: 33205,
          subassemblies: [
            { id: 's1', name: 'Engine', currentHours: 1000, lifeExpectancyHours: 10000, healthStatus: 'Good' },
          ],
          maintenanceLogs: [],
          scheduledMaintenances: [
            {
              id: 'sm1',
              type: 'Engine',
              intervalHrs: 500,
              lastMaintenanceDate: '2026-11-01T00:00:00Z',
              lastMaintenanceHmr: 33000,
            },
          ],
        }}
        canEdit={false}
        canManageScheduledMaintenance={false}
        initialFrom="maintenance"
        fleetMachines={[
          { id: 'm1', name: 'T2', category: 'Shovel', model: 'EX1200' },
          { id: 'm2', name: 'DM11', category: 'Drill', model: 'IDM30' },
        ]}
      />
    )

    expect(screen.getByRole('link', { name: /Back to Maintenance/i })).toHaveAttribute('href', '/?tab=maintenance')
    expect(screen.getByText(/33,205\.0/)).toBeInTheDocument()

    // Quick Equipment Switcher jumps directly to another machine
    fireEvent.change(screen.getByLabelText('Switch Equipment Unit'), { target: { value: 'm2' } })
    expect(pushMock).toHaveBeenCalledWith('/machines/m2?from=maintenance')

    // Read-only operator can open Scheduled Maintenance without hitting 403 GET API
    fireEvent.click(screen.getByRole('tab', { name: 'Scheduled Maintenance' }))
    expect(screen.getByText(/Read-only view:/i)).toBeInTheDocument()
    expect(screen.getByText(/295\.0/)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('InventoryView filters low stock parts and submits restock updates via PATCH /api/spares/[id]', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'sp2', name: 'Fuel Filter', partNumber: 'FF-200', stockQuantity: 11, reorderLevel: 3 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <InventoryView
        initialSpares={[
          { id: 'sp1', name: 'Engine Oil Filter', partNumber: 'LF-9009', stockQuantity: 15, reorderLevel: 4 },
          { id: 'sp2', name: 'Fuel Filter', partNumber: 'FF-200', stockQuantity: 1, reorderLevel: 3 },
        ]}
        canEdit={true}
      />
    )

    // Filter Low Stock Only
    fireEvent.click(screen.getByRole('button', { name: /Low Stock Only/i }))
    expect(screen.getByText('FF-200')).toBeInTheDocument()
    expect(screen.queryByText('LF-9009')).not.toBeInTheDocument()

    // Open Restock modal and add +10 units
    fireEvent.click(screen.getByRole('button', { name: 'Restock / Adjust' }))
    fireEvent.click(screen.getByRole('button', { name: '+10 units' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Stock Update' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/spares/sp2',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ stockQuantity: 11, reorderLevel: 3 }),
        })
      )
    })

    // Low stock count updates to 0 after restocking sp2
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Low Stock Only \(0\)/i })).toBeInTheDocument()
    })
  })
})
