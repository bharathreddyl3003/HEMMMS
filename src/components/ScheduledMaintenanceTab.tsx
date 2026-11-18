'use client'

import { useState, useEffect } from 'react'

type Schedule = {
  id: string
  type: string
  intervalHrs: number
  lastMaintenanceDate: string
  lastMaintenanceHmr: number
}

export default function ScheduledMaintenanceTab({ machineId, currentMachineHmr, canEdit }: { machineId: string, currentMachineHmr: number, canEdit: boolean }) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/machines/${machineId}/scheduled-maintenance`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error)
        } else {
          setSchedules(data)
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [machineId])

  const handleUpdate = async (type: string) => {
    if (!confirm(`Are you sure you want to record a new scheduled maintenance for ${type}? This will set the last maintenance HMR to the current machine HMR (${currentMachineHmr}).`)) {
      return
    }

    setUpdatingId(type)
    const res = await fetch(`/api/machines/${machineId}/scheduled-maintenance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        lastMaintenanceDate: new Date().toISOString(),
        lastMaintenanceHmr: currentMachineHmr
      })
    })

    if (res.ok) {
      const updated = await res.json()
      setSchedules(prev => prev.map(s => s.type === type ? updated : s))
    } else {
      const data = await res.json()
      alert('Failed to update scheduled maintenance: ' + (data.error || res.statusText))
    }
    setUpdatingId(null)
  }

  if (loading) return <div>Loading schedules...</div>
  if (error) return (
    <div style={{ padding: '2rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
      <strong>Error loading schedules:</strong> {error}
      <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
        If you just updated the system, you may need to restart your Next.js development server (Ctrl+C and npm run dev) so the Prisma Client can pick up the new database tables.
      </p>
    </div>
  )

  if (schedules.length === 0) return <div>No schedules found.</div>

  // Sort logically
  const order = ['Engine', 'Compressor', 'Hydraulic']
  const sorted = [...schedules].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  return (
    <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
      {sorted.map(s => {
        const hoursSinceLast = currentMachineHmr - s.lastMaintenanceHmr
        const hoursLeft = s.intervalHrs - hoursSinceLast
        
        // Calculate thresholds based on proportionality of interval.
        // Engine (250) -> Green > 150 (60%), Yellow 75-150 (30%-60%), Red < 75 (30%)
        const yellowThreshold = s.intervalHrs * 0.60
        const redThreshold = s.intervalHrs * 0.30

        let statusClass = 'success'
        if (hoursLeft <= redThreshold) statusClass = 'danger'
        else if (hoursLeft <= yellowThreshold) statusClass = 'warning'

        return (
          <div key={s.id} className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Flashing effect for red */}
            {statusClass === 'danger' && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(255, 60, 60, 0.05)',
                animation: 'pulse 2s infinite',
                pointerEvents: 'none'
              }} />
            )}
            
            <div className="flex-between mb-4">
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{s.type} Side</h2>
              <span className={`badge ${statusClass}`}>Every {s.intervalHrs} hrs</span>
            </div>

            <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px' }}>
              <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Last Maintenance Date:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{new Date(s.lastMaintenanceDate).toLocaleDateString()}</span>
              </div>
              <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Last Maintenance HMR:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{s.lastMaintenanceHmr.toFixed(1)} hrs</span>
              </div>
              <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                <span>Current HMR:</span>
                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{currentMachineHmr.toFixed(1)} hrs</span>
              </div>
            </div>

            <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hours Left to Next Maintenance</div>
              <div style={{ 
                fontFamily: 'Outfit, sans-serif',
                fontSize: '2.5rem', 
                fontWeight: 700, 
                lineHeight: 1,
                marginBottom: '1rem',
                color: statusClass === 'success' ? '#34d399' : statusClass === 'warning' ? '#fbbf24' : '#fb7185',
                textShadow: `0 0 20px ${statusClass === 'success' ? 'rgba(52, 211, 153, 0.4)' : statusClass === 'warning' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 113, 133, 0.4)'}`
              }}>
                {hoursLeft.toFixed(1)} <span style={{ fontSize: '1rem', opacity: 0.7, fontWeight: 500 }}>hrs</span>
              </div>

              {/* Visual Gauge */}
              <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.max(0, Math.min(100, (hoursLeft / s.intervalHrs) * 100))}%`, 
                  background: statusClass === 'success' ? 'var(--success)' : statusClass === 'warning' ? 'var(--warning)' : 'var(--danger)',
                  transition: 'width 1s ease-in-out',
                  boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                }} />
              </div>
            </div>

            {canEdit && (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => handleUpdate(s.type)}
                disabled={updatingId === s.type}
              >
                {updatingId === s.type ? 'Updating...' : 'Record New Maintenance Event'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
