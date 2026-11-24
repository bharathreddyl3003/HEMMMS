import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import HmrRegisterView from '@/components/HmrRegisterView'

export const dynamic = 'force-dynamic'

export default async function HmrRegisterPage(props: {
  searchParams: Promise<{ module?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const searchParams = await props.searchParams
  const activeModule = searchParams.module === 'drills' ? 'drills' : 'shovels'
  const canEdit = session.role === 'ADMIN' || !!session.permissions?.canEditMachines

  // Fetch all machines with scheduled maintenance and subassemblies
  const allMachines = await prisma.machine.findMany({
    include: {
      scheduledMaintenances: true,
      subassemblies: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Group into shovels and drills
  const shovels = allMachines.filter(m => m.category === 'Shovel')
  const drills = allMachines.filter(m => m.category === 'Drill' || !m.category)

  // Fetch initial completion records
  const initialCompletions = await prisma.maintenanceRecord.findMany({
    where: {
      logType: 'Scheduled Maintenance',
      status: 'Completed'
    },
    include: {
      machine: {
        include: {
          scheduledMaintenances: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  })

  return (
    <main>
      <HmrRegisterView
        shovels={shovels}
        drills={drills}
        initialCompletions={initialCompletions as any}
        activeModule={activeModule}
        canEdit={canEdit}
      />
    </main>
  )
}
