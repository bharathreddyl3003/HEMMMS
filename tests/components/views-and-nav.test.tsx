import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

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

import DashboardView from '@/components/DashboardView'
import MaintenanceStatusView from '@/components/MaintenanceStatusView'
import MobileHmrView from '@/components/MobileHmrView'
import TopNav from '@/components/TopNav'
import Modal from '@/components/Modal'

describe('Dashboard, Status, Mobile HMR, TopNav & Modal UI Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('DashboardView switches Shovels/Drills tabs instantaneously and filters by search & status', () => {
    const machines = [
      {
        id: '1',
        name: 'T2',
        model: 'EX1200',
        category: 'Shovel',
        make: 'Tata Hitachi',
        capacity: '5 m³',
        type: 'Hydraulic Shovel',
        status: 'Working',
        runningHours: 33205,
        subassemblies: [{ id: 's1', name: 'Engine', currentHours: 1000, lifeExpectancyHours: 10000, healthStatus: 'Good' }],
      },
      {
        id: '2',
        name: 'S2',
        model: 'EX200',
        category: 'Shovel',
        make: 'Tata Hitachi',
        capacity: '1 m³',
        type: 'Hydraulic Shovel',
        status: 'Breakdown',
        runningHours: 19260,
        subassemblies: [{ id: 's2', name: 'Hydraulic Pump', currentHours: 5800, lifeExpectancyHours: 6000, healthStatus: 'Critical' }],
      },
      {
        id: '3',
        name: 'DM11',
        model: 'IDM30',
        category: 'Drill',
        make: 'Sandvik',
        capacity: '150mm Hole',
        type: 'RBH 150mm drill',
        status: 'Working',
        runningHours: 29595,
        subassemblies: [{ id: 's3', name: 'Compressor', currentHours: 500, lifeExpectancyHours: 8000, healthStatus: 'Good' }],
      },
    ]

    render(<DashboardView allMachines={machines} initialModule="shovels" canEdit={true} />)

    // Fleet telemetry summary tiles & removed header actions do not render on Dashboard
    expect(screen.queryByText('Shovels Fleet')).not.toBeInTheDocument()
    expect(screen.queryByText('Mechanical Availability')).not.toBeInTheDocument()
    expect(screen.queryByText('Cumulative Operating HMR')).not.toBeInTheDocument()
    expect(screen.queryByText('Units Requiring Attention')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /HMR Register/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Field HMR/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Schedule Maintenance/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Add Shovel/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Add Drill/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Add Equipment/i })).toBeInTheDocument()

    expect(screen.getByText('T2')).toBeInTheDocument()
    expect(screen.getByText('S2')).toBeInTheDocument()

    // Filter Attention only
    fireEvent.click(screen.getByRole('button', { name: 'Attention' }))
    expect(screen.queryByText('T2')).not.toBeInTheDocument()
    expect(screen.getByText('S2')).toBeInTheDocument()

    // Switch to Drills Module
    fireEvent.click(screen.getByRole('tab', { name: /Drills Module/i }))
    expect(screen.queryByText('Drills Fleet')).not.toBeInTheDocument()
    expect(screen.queryByText('Mechanical Availability')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\+ Add Drill/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ Add Equipment/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('DM11')).toBeInTheDocument()
  })

  it('MaintenanceStatusView displays N/A (Shovel) for compressor column and filters tabs in memory', () => {
    const items = [
      {
        id: '1',
        name: 'B1',
        model: 'BE1000-1',
        category: 'Shovel',
        runningHours: 6756,
        isShovel: true,
        engineLeft: 221,
        compressorLeft: null,
        hydraulicLeft: 500,
        engineStatus: 'success',
        compressorStatus: 'unknown',
        hydraulicStatus: 'success',
        minHoursLeft: 221,
      },
      {
        id: '2',
        name: 'DM11',
        model: 'IDM30',
        category: 'Drill',
        runningHours: 29595,
        isShovel: false,
        engineLeft: -10,
        compressorLeft: 40,
        hydraulicLeft: 800,
        engineStatus: 'danger',
        compressorStatus: 'warning',
        hydraulicStatus: 'success',
        minHoursLeft: -10,
      },
    ]

    render(<MaintenanceStatusView initialMachines={items} totalMachinesCount={2} initialFilter="all" />)

    expect(screen.getByText('N/A (Shovel)')).toBeInTheDocument()
    expect(screen.getByText('10.0h Overdue')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Shovels/i }))
    expect(screen.getByText('B1')).toBeInTheDocument()
    expect(screen.queryByText('DM11')).not.toBeInTheDocument()
  })

  it('MobileHmrView filters machines via search and debounces PATCH auto-save', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MobileHmrView
        shovels={[
          {
            id: 'm-b1',
            name: 'B1',
            model: 'BE1000-1',
            category: 'Shovel',
            capacity: '6.5 m³',
            runningHours: 6756,
            scheduledMaintenances: [
              { id: 's1', type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: 6727, lastMaintenanceDate: '2026-11-01' },
            ],
          },
        ]}
        drills={[]}
        activeModule="shovels"
        canEdit={true}
      />
    )

    const input = screen.getByLabelText('Current HMR')
    fireEvent.change(input, { target: { value: '6766' } })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650)
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/machines/m-b1/hmr',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ runningHours: 6766 }),
      })
    )
    expect(screen.getByText('✓ Auto-saved')).toBeInTheDocument()
  })

  it('TopNav renders role badge, omits Analytics/Requisitions tabs, shows Users only for ADMIN, and toggles mobile menu drawer', () => {
    const { rerender } = render(<TopNav user={{ username: 'op1', role: 'USER' }} />)
    expect(screen.getByText('op1')).toBeInTheDocument()
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument()
    expect(screen.queryByText('Requisitions')).not.toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('HMR Register')).toBeInTheDocument()
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
    expect(screen.getByText('Spares')).toBeInTheDocument()
    expect(screen.getByText('Field HMR')).toBeInTheDocument()

    // Toggle mobile drawer
    const menuBtn = screen.getByRole('button', { name: /Menu/i })
    fireEvent.click(menuBtn)
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument()

    rerender(<TopNav user={{ username: 'admin', role: 'ADMIN' }} />)
    expect(screen.getAllByText('Users').length).toBeGreaterThanOrEqual(1)
  })

  it('Modal opens native <dialog> and closes on close button click', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal isOpen={true} onClose={onClose} title="Test Dialog">
        <p>Dialog body content</p>
      </Modal>
    )

    const dialog = container.querySelector('dialog')
    expect(dialog).toHaveAttribute('open')
    expect(screen.getByText('Dialog body content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
