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

  // Fetch machines and completion records in parallel for maximum performance
  const [allMachines, initialCompletions] = await Promise.all([
    prisma.machine.findMany({
      include: {
        scheduledMaintenances: true
      },
      orderBy: {
        name: 'asc'
      }
    }),
    prisma.maintenanceRecord.findMany({
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
  ])

  // Group into shovels and drills
  const shovels = allMachines.filter(m => m.category === 'Shovel')
  const drills = allMachines.filter(m => m.category === 'Drill' || !m.category)

  return (
    <main>
      <HmrRegisterView
        shovels={shovels as any}
        drills={drills as any}
        initialCompletions={initialCompletions as any}
        activeModule={activeModule}
        canEdit={canEdit}
      />
    </main>
  )
}
