import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

import ReportsView from '@/components/ReportsView'
import DailyLogsList from '@/components/DailyLogsList'
import ScheduledMaintenanceTab from '@/components/ScheduledMaintenanceTab'

describe('ReportsView, DailyLogsList & ScheduledMaintenanceTab Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('ReportsView calculates total cost, downtime, and proactive service ratio across filters', () => {
    const now = new Date()
    const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)

    const machines = [
      { id: 'm1', name: 'T2', model: 'EX1200', runningHours: 33205, status: 'Working' },
      { id: 'm2', name: 'B1', model: 'BE1000-1', runningHours: 6756, status: 'Working' },
    ]

    const records = [
      {
        id: '1',
        machineId: 'm1',
        description: '500h Engine PM',
        logType: 'Scheduled Maintenance',
        hmr: 32822,
        status: 'Completed',
        performedBy: 'Mahesh',
        partsUsed: 'Filter',
        timeSpentHrs: 4,
        cost: 500,
        subassemblyName: 'Engine',
        createdAt: now.toISOString(),
        machine: machines[0],
      },
      {
        id: '2',
        machineId: 'm2',
        description: 'Hose burst',
        logType: 'Incident',
        hmr: 6700,
        status: 'Completed',
        performedBy: 'Raj',
        partsUsed: 'Hose',
        timeSpentHrs: 6,
        cost: 300,
        subassemblyName: 'Hydraulic',
        createdAt: oldDate.toISOString(),
        machine: machines[1],
      },
    ]

    render(<ReportsView initialRecords={records} machines={machines} />)

    // All records: 2 events, $800.00, 10.0 hrs, 50% proactive (1/2)
    expect(screen.getByText('$800.00')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()

    // Filter to Last 7 Days -> only 500h Engine PM ($500.00, 100% proactive)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: '7D' } })

    expect(screen.getAllByText('$500.00')).toHaveLength(2)
    expect(screen.getByText('100%')).toBeInTheDocument()
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
    expect(screen.getByText(/117.0/)).toBeInTheDocument() // 500 - (33205 - 32822) = 117.0

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
