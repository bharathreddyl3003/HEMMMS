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
    <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.75rem 1.5rem 3rem' }}>
      <div className="mb-6">
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '0.3rem' }}>
          Cost &amp; Reliability Analytics
        </div>
        <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Fleet Maintenance Analytics &amp; Reports
        </h1>
        <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Real-time expenditure, labor downtime, proactive ratios, and compliance records
        </p>
      </div>

      <ReportsView initialRecords={records} machines={machines} />
    </main>
  )
}
