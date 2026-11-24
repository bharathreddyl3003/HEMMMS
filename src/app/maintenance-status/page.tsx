import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import MaintenanceStatusView, { ProcessedMachineStatus } from '@/components/MaintenanceStatusView'

export const dynamic = 'force-dynamic'

export default async function MaintenanceStatusPage(props: {
  searchParams: Promise<{ module?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const searchParams = await props.searchParams
  const activeFilter = (searchParams.module as 'all' | 'shovels' | 'drills') || 'all'

  // Fetch all machines with their scheduled maintenance in a single fast query
  const machines = await prisma.machine.findMany({
    include: {
      scheduledMaintenances: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Process data once on server
  const processedMachines: ProcessedMachineStatus[] = machines.map(machine => {
    const isShovel = machine.category === 'Shovel'

    const getHoursLeft = (type: string) => {
      const schedule = machine.scheduledMaintenances.find(s => s.type === type)
      if (!schedule) return null
      const hoursSinceLast = machine.runningHours - schedule.lastMaintenanceHmr
      return schedule.intervalHrs - hoursSinceLast
    }

    const engineLeft = getHoursLeft('Engine')
    const compressorLeft = isShovel ? null : getHoursLeft('Compressor')
    const hydraulicLeft = getHoursLeft('Hydraulic')

    const applicableLeft = isShovel 
      ? [engineLeft, hydraulicLeft].filter(val => val !== null) as number[]
      : [engineLeft, compressorLeft, hydraulicLeft].filter(val => val !== null) as number[]

    const minHoursLeft = applicableLeft.length > 0 ? Math.min(...applicableLeft) : Infinity

    const getStatusClass = (hoursLeft: number | null, type: string) => {
      if (hoursLeft === null) return 'unknown'
      const schedule = machine.scheduledMaintenances.find(s => s.type === type)
      if (!schedule) return 'unknown'
      
      if (hoursLeft <= 0) return 'danger'
      const yellowThreshold = schedule.intervalHrs * 0.40
      const redThreshold = schedule.intervalHrs * 0.15

      if (hoursLeft <= redThreshold) return 'danger'
      if (hoursLeft <= yellowThreshold) return 'warning'
      return 'success'
    }

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
      engineStatus: getStatusClass(engineLeft, 'Engine'),
      compressorStatus: getStatusClass(compressorLeft, 'Compressor'),
      hydraulicStatus: getStatusClass(hydraulicLeft, 'Hydraulic'),
      minHoursLeft
    }
  })

  // Sort by least hours left on top (most critical first)
  processedMachines.sort((a, b) => a.minHoursLeft - b.minHoursLeft)

  return (
    <MaintenanceStatusView
      initialMachines={processedMachines}
      totalMachinesCount={machines.length}
      initialFilter={activeFilter}
    />
  )
}
