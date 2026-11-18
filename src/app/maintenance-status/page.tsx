import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MaintenanceStatusPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  // Fetch all machines with their scheduled maintenance
  const machines = await prisma.machine.findMany({
    include: {
      scheduledMaintenances: true
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Process and sort data
  const processedMachines = machines.map(machine => {
    // Helper to calculate hours left
    const getHoursLeft = (type: string) => {
      const schedule = machine.scheduledMaintenances.find(s => s.type === type)
      if (!schedule) return null
      const hoursSinceLast = machine.runningHours - schedule.lastMaintenanceHmr
      return schedule.intervalHrs - hoursSinceLast
    }

    const engineLeft = getHoursLeft('Engine')
    const compressorLeft = getHoursLeft('Compressor')
    const hydraulicLeft = getHoursLeft('Hydraulic')

    // Find the minimum hours left across the three categories
    const allLeft = [engineLeft, compressorLeft, hydraulicLeft].filter(val => val !== null) as number[]
    const minHoursLeft = allLeft.length > 0 ? Math.min(...allLeft) : Infinity

    // Helper for threshold percentages
    const getStatusClass = (hoursLeft: number | null, type: string) => {
      if (hoursLeft === null) return 'unknown'
      const schedule = machine.scheduledMaintenances.find(s => s.type === type)
      if (!schedule) return 'unknown'
      
      const yellowThreshold = schedule.intervalHrs * 0.60
      const redThreshold = schedule.intervalHrs * 0.30

      if (hoursLeft <= redThreshold) return 'danger'
      if (hoursLeft <= yellowThreshold) return 'warning'
      return 'success'
    }

    return {
      ...machine,
      engineLeft,
      compressorLeft,
      hydraulicLeft,
      engineStatus: getStatusClass(engineLeft, 'Engine'),
      compressorStatus: getStatusClass(compressorLeft, 'Compressor'),
      hydraulicStatus: getStatusClass(hydraulicLeft, 'Hydraulic'),
      minHoursLeft
    }
  })

  // Sort by least hours left on top
  processedMachines.sort((a, b) => a.minHoursLeft - b.minHoursLeft)

  return (
    <div className="page-container fade-in">
      <div className="flex-between mb-6">
        <h1 className="text-2xl font-bold" style={{ textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>Fleet Maintenance Status</h1>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto', padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1.5rem 1rem' }}>Machine</th>
              <th style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>Current HMR</th>
              <th style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>Engine Side (Left)</th>
              <th style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>Compressor Side (Left)</th>
              <th style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>Hydraulic Side (Left)</th>
            </tr>
          </thead>
          <tbody>
            {processedMachines.map((m, idx) => (
              <tr 
                key={m.id} 
                style={{ 
                  borderBottom: idx === processedMachines.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                  transition: 'background 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <td style={{ padding: '1.5rem 1rem' }}>
                  <Link href={`/machines/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{m.name}</div>
                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{m.model} {m.serialNumber ? `• ${m.serialNumber}` : ''}</div>
                  </Link>
                </td>
                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    {m.runningHours.toFixed(1)} hrs
                  </span>
                </td>
                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                  <StatusCell hoursLeft={m.engineLeft} status={m.engineStatus} />
                </td>
                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                  <StatusCell hoursLeft={m.compressorLeft} status={m.compressorStatus} />
                </td>
                <td style={{ padding: '1.5rem 1rem', textAlign: 'center' }}>
                  <StatusCell hoursLeft={m.hydraulicLeft} status={m.hydraulicStatus} />
                </td>
              </tr>
            ))}
            {processedMachines.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No machines found.
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

  let color = '#34d399'
  let shadow = 'rgba(52, 211, 153, 0.4)'
  
  if (status === 'warning') {
    color = '#fbbf24'
    shadow = 'rgba(251, 191, 36, 0.4)'
  } else if (status === 'danger') {
    color = '#fb7185'
    shadow = 'rgba(251, 113, 133, 0.4)'
  }

  return (
    <div style={{ 
      display: 'inline-block',
      padding: '0.75rem 1rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.05)',
      minWidth: '100px'
    }}>
      <div style={{
        fontFamily: 'Outfit, sans-serif',
        fontSize: '1.4rem',
        fontWeight: 700,
        color: color,
        textShadow: `0 0 15px ${shadow}`
      }}>
        {hoursLeft.toFixed(1)}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
        hrs
      </div>
    </div>
  )
}
