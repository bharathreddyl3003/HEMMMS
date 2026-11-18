import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import ReportsView from '@/components/ReportsView'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [records, machines] = await Promise.all([
    prisma.maintenanceRecord.findMany({
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            model: true,
            runningHours: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    }),
    prisma.machine.findMany({
      select: {
        id: true,
        name: true,
        model: true,
        runningHours: true,
        status: true
      },
      orderBy: {
        name: 'asc'
      }
    })
  ])

  return (
    <div className="page-container fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)', margin: 0 }}>
          Fleet Maintenance Analytics & Reports
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Real-time expenditure, labor downtime, proactive ratios, and compliance records
        </p>
      </div>

      <ReportsView initialRecords={records} machines={machines} />
    </div>
  )
}
