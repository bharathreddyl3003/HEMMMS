import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MaintenanceStatusPage(props: {
  searchParams: Promise<{ module?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const searchParams = await props.searchParams
  const activeFilter = searchParams.module || 'all'

  // Fetch all machines with their scheduled maintenance
  const machines = await prisma.machine.findMany({
    include: {
      scheduledMaintenances: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Filter based on active module tab
  const filteredMachines = machines.filter(m => {
    if (activeFilter === 'shovels') return m.category === 'Shovel'
    if (activeFilter === 'drills') return m.category === 'Drill' || !m.category
    return true
  })

  // Process and sort data
  let overdueCount = 0
  let dueSoonCount = 0

  const processedMachines = filteredMachines.map(machine => {
    const isShovel = machine.category === 'Shovel'

    // Helper to calculate hours left
    const getHoursLeft = (type: string) => {
      const schedule = machine.scheduledMaintenances.find(s => s.type === type)
      if (!schedule) return null
      const hoursSinceLast = machine.runningHours - schedule.lastMaintenanceHmr
      return schedule.intervalHrs - hoursSinceLast
    }

    const engineLeft = getHoursLeft('Engine')
    const compressorLeft = isShovel ? null : getHoursLeft('Compressor')
    const hydraulicLeft = getHoursLeft('Hydraulic')

    // Find the minimum hours left across applicable categories (ignore compressor for shovels)
    const applicableLeft = isShovel 
      ? [engineLeft, hydraulicLeft].filter(val => val !== null) as number[]
      : [engineLeft, compressorLeft, hydraulicLeft].filter(val => val !== null) as number[]

    const minHoursLeft = applicableLeft.length > 0 ? Math.min(...applicableLeft) : Infinity

    if (minHoursLeft <= 0) {
      overdueCount++
    } else if (minHoursLeft <= 50) {
      dueSoonCount++
    }

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
      ...machine,
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
    <div className="page-container fade-in" style={{ maxWidth: '1240px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)', margin: 0 }}>
            Fleet Maintenance Status
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time scheduled service tracking sorted by highest urgency first
          </p>
        </div>

        <Link href="/" className="btn btn-secondary">
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Module Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link
          href="/maintenance-status?module=all"
          className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
        >
          All Fleet ({machines.length})
        </Link>
        <Link
          href="/maintenance-status?module=shovels"
          className={`btn ${activeFilter === 'shovels' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
        >
          🚜 Shovels ({machines.filter(m => m.category === 'Shovel').length})
        </Link>
        <Link
          href="/maintenance-status?module=drills"
          className={`btn ${activeFilter === 'drills' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '0.45rem 1rem' }}
        >
          🛠️ Drills ({machines.filter(m => m.category === 'Drill' || !m.category).length})
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Filtered Fleet Units</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
            {processedMachines.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: overdueCount > 0 ? '4px solid #ef4444' : undefined }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Overdue Services</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: overdueCount > 0 ? '#ef4444' : '#34d399' }}>
            {overdueCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: dueSoonCount > 0 ? '4px solid #fbbf24' : undefined }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Due in &lt; 50 Hours</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: dueSoonCount > 0 ? '#fbbf24' : '#34d399' }}>
            {dueSoonCount} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.25rem 1rem' }}>Equipment</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Current HMR</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Engine Side (250h)</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                Compressor Side (500h)
              </th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Hydraulic Side (1000h)</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {processedMachines.map((m, idx) => (
              <tr 
                key={m.id} 
                style={{ 
                  borderBottom: idx === processedMachines.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.2s ease',
                  background: m.minHoursLeft <= 0 ? 'rgba(239, 68, 68, 0.05)' : undefined
                }}
              >
                <td style={{ padding: '1.25rem 1rem' }}>
                  <Link href={`/machines/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{m.isShovel ? '🚜' : '🛠️'}</span>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--accent)' }}>{m.name}</span>
                      {m.capacity && (
                        <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)' }}>
                          {m.capacity}
                        </span>
                      )}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {m.make ? `${m.make} ` : ''}{m.model} {m.serialNumber ? `• S/N: ${m.serialNumber}` : ''}
                    </div>
                  </Link>
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', fontWeight: 600 }}>
                    {m.runningHours.toFixed(1)} hrs
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <StatusCell hoursLeft={m.engineLeft} status={m.engineStatus} />
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                  {m.isShovel ? (
                    <div style={{ 
                      padding: '0.5rem 0.75rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      N/A (Shovel)
                    </div>
                  ) : (
                    <StatusCell hoursLeft={m.compressorLeft} status={m.compressorStatus} />
                  )}
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <StatusCell hoursLeft={m.hydraulicLeft} status={m.hydraulicStatus} />
                </td>
                <td style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>
                  <Link 
                    href={`/machines/${m.id}?tab=scheduled`}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    View / Service &rarr;
                  </Link>
                </td>
              </tr>
            ))}
            {processedMachines.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No equipment found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusCell({ hoursLeft, status }: { hoursLeft: number | null, status: string }) {
  if (hoursLeft === null) {
    return <span style={{ color: 'var(--text-secondary)' }}>N/A</span>
  }

  const isOverdue = hoursLeft <= 0

  let color = '#34d399'
  let shadow = 'rgba(52, 211, 153, 0.4)'
  
  if (isOverdue) {
    color = '#ef4444'
    shadow = 'rgba(239, 68, 68, 0.6)'
  } else if (status === 'warning') {
    color = '#fbbf24'
    shadow = 'rgba(251, 191, 36, 0.4)'
  } else if (status === 'danger') {
    color = '#fb7185'
    shadow = 'rgba(251, 113, 133, 0.4)'
  }

  return (
    <div style={{ 
      display: 'inline-block',
      padding: '0.6rem 0.85rem',
      background: 'rgba(0,0,0,0.35)',
      borderRadius: '8px',
      border: isOverdue ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)',
      minWidth: '95px'
    }}>
      <div style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '1.25rem',
        fontWeight: 700,
        color: color,
        textShadow: `0 0 15px ${shadow}`
      }}>
        {isOverdue ? Math.abs(hoursLeft).toFixed(1) : hoursLeft.toFixed(1)}
      </div>
      <div style={{ 
        fontSize: '0.7rem', 
        color: isOverdue ? '#ef4444' : 'var(--text-secondary)', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        fontWeight: isOverdue ? 700 : 500,
        marginTop: '2px' 
      }}>
        {isOverdue ? 'hrs OVERDUE' : 'hrs left'}
      </div>
    </div>
  )
}
