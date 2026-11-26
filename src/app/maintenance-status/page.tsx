import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import MaintenanceStatusView from '@/components/MaintenanceStatusView'
import { buildMaintenanceStatuses } from '@/lib/maintenance-status'

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

  const processedMachines = buildMaintenanceStatuses(machines)

  return (
    <MaintenanceStatusView
      initialMachines={processedMachines}
      totalMachinesCount={machines.length}
      initialFilter={activeFilter}
    />
  )
}
