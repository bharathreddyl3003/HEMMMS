import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

import DailyLogsList from '@/components/DailyLogsList'
import ScheduledMaintenanceTab from '@/components/ScheduledMaintenanceTab'

describe('DailyLogsList & ScheduledMaintenanceTab Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('DailyLogsList filters by log type and search query and resets filters', () => {
    const logs = [
      {
        id: 'l1',
        description: 'Engine oil & filter change',
        logType: 'Scheduled Maintenance',
        hmr: 32822,
        dueDate: null,
        status: 'Completed',
        performedBy: 'Asari Mahesh',
        partsUsed: 'LF-9009',
        timeSpentHrs: 3,
        cost: 200,
        subassemblyName: 'Engine',
        createdAt: '2026-11-24T08:00:00Z',
      },
      {
        id: 'l2',
        description: 'Hydraulic boom hose repair',
        logType: 'Repair',
        hmr: 33000,
        dueDate: null,
        status: 'Completed',
        performedBy: 'Mande Srinivas',
        partsUsed: 'Hose',
        timeSpentHrs: 5,
        cost: 450,
        subassemblyName: 'Hydraulic',
        createdAt: '2026-11-24T12:00:00Z',
      },
    ]

    render(<DailyLogsList machineId="m1" initialLogs={logs} currentHmr={33205} />)

    expect(screen.getByText('Engine oil & filter change')).toBeInTheDocument()
    expect(screen.getByText('Hydraulic boom hose repair')).toBeInTheDocument()

    // Search for Mahesh
    fireEvent.change(screen.getByPlaceholderText(/Search technician/i), {
      target: { value: 'Mahesh' },
    })
    expect(screen.getByText('Engine oil & filter change')).toBeInTheDocument()
    expect(screen.queryByText('Hydraulic boom hose repair')).not.toBeInTheDocument()

    // Search miss shows Clear Filters button and resets cleanly
    fireEvent.change(screen.getByPlaceholderText(/Search technician/i), {
      target: { value: 'nonexistent' },
    })
    expect(screen.getByText(/No maintenance logs match your filter/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }))
    expect(screen.getByText('Hydraulic boom hose repair')).toBeInTheDocument()
  })

  it('ScheduledMaintenanceTab loads schedules, handles fetch error, and deducts spares on completion', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    // 1. Fetch error state
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Forbidden' }),
    })

    const { unmount } = render(
      <ScheduledMaintenanceTab machineId="m1" currentMachineHmr={33205} canEdit={true} />
    )
    await waitFor(() => {
      expect(screen.getByText(/Error loading schedules:/i)).toBeInTheDocument()
    })
    unmount()

    // 2. Happy path + completion with spares
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 'sm1',
            type: 'Engine',
            intervalHrs: 500,
            lastMaintenanceDate: '2026-11-01T00:00:00Z',
            lastMaintenanceHmr: 32822,
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'sp-1', name: 'Lube Filter', partNumber: 'LF-1', stockQuantity: 5, reorderLevel: 2 },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'sm1',
          type: 'Engine',
          intervalHrs: 500,
          lastMaintenanceDate: '2026-11-26T00:00:00Z',
          lastMaintenanceHmr: 33205,
          lowStockAlerts: [],
        }),
      })

    render(<ScheduledMaintenanceTab machineId="m1" currentMachineHmr={33205} canEdit={true} />)

    await waitFor(() => {
      expect(screen.getByText('Engine Side')).toBeInTheDocument()
    })
    expect(screen.getByText(/117.0/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Record Engine Service Completed/i }))
    await waitFor(() => {
      expect(screen.getByLabelText('Select spare part from inventory')).toBeInTheDocument()
    })

    const techInput = screen.getByPlaceholderText(/John Doe/i)
    fireEvent.change(techInput, { target: { value: 'Raj kumar' } })

    fireEvent.change(screen.getByLabelText('Select spare part from inventory'), {
      target: { value: 'sp-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '+ Add' }))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm & Reset Interval Clock/i }))
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/machines/m1/scheduled-maintenance',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('"sparePartId":"sp-1","quantity":1'),
      })
    )
  })
})
