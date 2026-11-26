export interface ProcessedMachineStatus {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  serialNumber?: string | null
  runningHours: number
  isShovel: boolean
  engineLeft: number | null
  compressorLeft: number | null
  hydraulicLeft: number | null
  engineStatus: string
  compressorStatus: string
  hydraulicStatus: string
  minHoursLeft: number
}

export interface MachineStatusSource {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  serialNumber?: string | null
  runningHours: number
  scheduledMaintenances?: Array<{
    type: string
    intervalHrs: number
    lastMaintenanceHmr: number
  }>
}

function getStatusClass(
  hoursLeft: number | null,
  intervalHrs: number | undefined
): string {
  if (hoursLeft === null || intervalHrs === undefined) return 'unknown'
  if (hoursLeft <= 0) return 'danger'

  const yellowThreshold = intervalHrs * 0.40
  const redThreshold = intervalHrs * 0.15

  if (hoursLeft <= redThreshold) return 'danger'
  if (hoursLeft <= yellowThreshold) return 'warning'
  return 'success'
}

/**
 * Computes preventive maintenance countdowns and urgency status for each machine,
 * sorted with the most urgent/overdue units first.
 */
export function buildMaintenanceStatuses(
  machines: MachineStatusSource[]
): ProcessedMachineStatus[] {
  const processed = machines.map((machine) => {
    const isShovel = machine.category === 'Shovel'
    const schedules = machine.scheduledMaintenances ?? []

    const getSchedule = (type: string) => schedules.find((s) => s.type === type)
    const getHoursLeft = (type: string) => {
      const schedule = getSchedule(type)
      if (!schedule) return null
      const hoursSinceLast = machine.runningHours - schedule.lastMaintenanceHmr
      return schedule.intervalHrs - hoursSinceLast
    }

    const engineLeft = getHoursLeft('Engine')
    const compressorLeft = isShovel ? null : getHoursLeft('Compressor')
    const hydraulicLeft = getHoursLeft('Hydraulic')

    const applicableLeft = (
      isShovel
        ? [engineLeft, hydraulicLeft]
        : [engineLeft, compressorLeft, hydraulicLeft]
    ).filter((val): val is number => val !== null)

    const minHoursLeft = applicableLeft.length > 0 ? Math.min(...applicableLeft) : Infinity

    return {
      id: machine.id,
      name: machine.name,
      model: machine.model,
      category: machine.category,
      make: machine.make,
      capacity: machine.capacity,
      serialNumber: machine.serialNumber,
      runningHours: machine.runningHours,
      isShovel,
      engineLeft,
      compressorLeft,
      hydraulicLeft,
      engineStatus: getStatusClass(engineLeft, getSchedule('Engine')?.intervalHrs),
      compressorStatus: getStatusClass(compressorLeft, getSchedule('Compressor')?.intervalHrs),
      hydraulicStatus: getStatusClass(hydraulicLeft, getSchedule('Hydraulic')?.intervalHrs),
      minHoursLeft,
    }
  })

  return processed.sort((a, b) => a.minHoursLeft - b.minHoursLeft)
}
