import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import MobileHmrView from '@/components/MobileHmrView'

export const dynamic = 'force-dynamic'

export default async function MobileHmrPage(props: {
  searchParams: Promise<{ module?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const searchParams = await props.searchParams
  const activeModule = searchParams.module === 'drills' ? 'drills' : 'shovels'
  const canEdit = session.role === 'ADMIN' || !!session.permissions?.canEditMachines

  const allMachines = await prisma.machine.findMany({
    include: {
      scheduledMaintenances: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  const shovels = allMachines.filter(m => m.category === 'Shovel')
  const drills = allMachines.filter(m => m.category === 'Drill' || !m.category)

  return (
    <main>
      <MobileHmrView
        shovels={shovels as any}
        drills={drills as any}
        activeModule={activeModule}
        canEdit={canEdit}
      />
    </main>
  )
}
