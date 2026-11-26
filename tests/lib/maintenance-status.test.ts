import { describe, it, expect } from 'vitest'
import { buildMaintenanceStatuses } from '@/lib/maintenance-status'

describe('buildMaintenanceStatuses helper', () => {
  it('computes hours remaining and sorts machines with lowest minHoursLeft first', () => {
    const result = buildMaintenanceStatuses([
      {
        id: 'healthy',
        name: 'T2',
        model: 'EX1200',
        category: 'Shovel',
        runningHours: 1000,
        scheduledMaintenances: [
          { type: 'Engine', intervalHrs: 500, lastMaintenanceHmr: 800 }, // 300h left (> 40%) -> success
          { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: 200 }, // 200h left (<= 40%) -> warning
        ],
      },
      {
        id: 'overdue',
        name: 'DM11',
        model: 'IDM30',
        category: 'Drill',
        runningHours: 530,
        scheduledMaintenances: [
          { type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: 250 }, // -30h overdue -> danger
          { type: 'Compressor', intervalHrs: 500, lastMaintenanceHmr: 500 }, // 470h left -> success
          { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: 450 }, // 920h left -> success
        ],
      },
      {
        id: 'unconfigured',
        name: 'PC450',
        model: 'PC450',
        category: 'Shovel',
        runningHours: 120,
        scheduledMaintenances: [],
      },
    ])

    expect(result.map((r) => r.id)).toEqual(['overdue', 'healthy', 'unconfigured'])

    // Overdue drill
    expect(result[0].isShovel).toBe(false)
    expect(result[0].engineLeft).toBe(-30)
    expect(result[0].engineStatus).toBe('danger')
    expect(result[0].compressorLeft).toBe(470)
    expect(result[0].compressorStatus).toBe('success')

    // Shovel omits compressor and catches warning hydraulic interval
    expect(result[1].isShovel).toBe(true)
    expect(result[1].compressorLeft).toBeNull()
    expect(result[1].compressorStatus).toBe('unknown')
    expect(result[1].engineStatus).toBe('success')
    expect(result[1].hydraulicStatus).toBe('warning')
    expect(result[1].minHoursLeft).toBe(200)

    // Unconfigured machine sorts last with Infinity minHoursLeft
    expect(result[2].minHoursLeft).toBe(Infinity)
    expect(result[2].engineStatus).toBe('unknown')
  })

  it('flags intervals within 15% remaining as danger', () => {
    const [status] = buildMaintenanceStatuses([
      {
        id: 'red-zone',
        name: 'S3',
        model: 'PC450',
        category: 'Shovel',
        runningHours: 230,
        scheduledMaintenances: [
          { type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: 0 }, // 20h left (8% of 250 <= 15%) -> danger
        ],
      },
    ])

    expect(status.engineLeft).toBe(20)
    expect(status.engineStatus).toBe('danger')
  })
})
