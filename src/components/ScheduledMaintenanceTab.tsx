'use client'

import { useState, useEffect } from 'react'
import Modal from './Modal'
import SparePartUsageSelector, { SelectedSpareUsage } from './SparePartUsageSelector'
import LowStockAlertModal from './LowStockAlertModal'
import type { LowStockAlert } from '@/lib/spares'

type Schedule = {
  id: string
  type: string
  intervalHrs: number
  lastMaintenanceDate: string
  lastMaintenanceHmr: number
}

export default function ScheduledMaintenanceTab({ 
  machineId, 
  currentMachineHmr, 
  canEdit 
}: { 
  machineId: string, 
  currentMachineHmr: number, 
  canEdit: boolean 
}) {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modal state
  const [activeModalType, setActiveModalType] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedParts, setSelectedParts] = useState<SelectedSpareUsage[]>([])
  const [manualPartsUsed, setManualPartsUsed] = useState('')
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])

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

  const handleCompleteService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!activeModalType) return
    setSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const serviceHmr = formData.get('serviceHmr') ? parseFloat(formData.get('serviceHmr') as string) : currentMachineHmr

    try {
      const res = await fetch(`/api/machines/${machineId}/scheduled-maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: activeModalType,
          lastMaintenanceDate: new Date().toISOString(),
          lastMaintenanceHmr: serviceHmr,
          description: formData.get('description'),
          performedBy: formData.get('performedBy') || null,
          partsUsed: manualPartsUsed || null,
          deductedParts: selectedParts,
          timeSpentHrs: formData.get('timeSpentHrs') ? parseFloat(formData.get('timeSpentHrs') as string) : null,
          cost: formData.get('cost') ? parseFloat(formData.get('cost') as string) : null
        })
      })

      if (res.ok) {
        const updated = await res.json()
        setSchedules(prev => prev.map(s => s.type === activeModalType ? updated : s))
        setActiveModalType(null)
        setSelectedParts([])
        setManualPartsUsed('')
        if (Array.isArray(updated.lowStockAlerts) && updated.lowStockAlerts.length > 0) {
          setLowStockAlerts(updated.lowStockAlerts)
        }
      } else {
        const data = await res.json()
        alert('Failed to update scheduled maintenance: ' + (data.error || res.statusText))
      }
    } catch (err: any) {
      alert('Error updating schedule: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading schedules...</div>
  if (error) return (
    <div style={{ padding: '2rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', borderRadius: '8px' }}>
      <strong>Error loading schedules:</strong> {error}
    </div>
  )

  if (schedules.length === 0) return <div>No schedules found.</div>

  // Sort logically: Engine -> Compressor -> Hydraulic
  const order = ['Engine', 'Compressor', 'Hydraulic']
  const sorted = [...schedules].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  return (
    <>
      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {sorted.map(s => {
          const hoursSinceLast = currentMachineHmr - s.lastMaintenanceHmr
          const hoursLeft = s.intervalHrs - hoursSinceLast
          const isOverdue = hoursLeft <= 0
          
          const yellowThreshold = s.intervalHrs * 0.40
          const redThreshold = s.intervalHrs * 0.15

          let statusClass = 'success'
          if (isOverdue || hoursLeft <= redThreshold) statusClass = 'danger'
          else if (hoursLeft <= yellowThreshold) statusClass = 'warning'

          return (
            <div key={s.id} className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
              {/* Flashing glow effect for overdue / danger */}
              {statusClass === 'danger' && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 60, 60, 0.04)',
                  animation: 'pulse 2s infinite',
                  pointerEvents: 'none'
                }} />
              )}
              
              <div className="flex-between mb-4">
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{s.type} Side</h2>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {isOverdue && (
                    <span className="badge danger" style={{ animation: 'pulse 1.5s infinite' }}>
                      OVERDUE
                    </span>
                  )}
                  <span className={`badge ${statusClass}`}>Every {s.intervalHrs} hrs</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '12px' }}>
                <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Last Service Date:</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{new Date(s.lastMaintenanceDate).toLocaleDateString()}</span>
                </div>
                <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Last Service HMR:</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{s.lastMaintenanceHmr.toFixed(1)} hrs</span>
                </div>
                <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span>Current Machine HMR:</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{currentMachineHmr.toFixed(1)} hrs</span>
                </div>
              </div>

              <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isOverdue ? 'Service Overdue By' : 'Hours Left to Next Service'}
                </div>
                <div style={{ 
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: '2.5rem', 
                  fontWeight: 700, 
                  lineHeight: 1,
                  marginBottom: '1rem',
                  color: isOverdue ? '#ef4444' : statusClass === 'success' ? '#34d399' : statusClass === 'warning' ? '#fbbf24' : '#fb7185',
                  textShadow: `0 0 20px ${isOverdue ? 'rgba(239, 68, 68, 0.6)' : statusClass === 'success' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`
                }}>
                  {isOverdue ? Math.abs(hoursLeft).toFixed(1) : hoursLeft.toFixed(1)}{' '}
                  <span style={{ fontSize: '1rem', opacity: 0.7, fontWeight: 500 }}>hrs {isOverdue && 'OVERDUE'}</span>
                </div>

                {/* Visual Gauge */}
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.max(0, Math.min(100, (hoursLeft / s.intervalHrs) * 100))}%`, 
                    background: isOverdue ? '#ef4444' : statusClass === 'success' ? 'var(--success)' : statusClass === 'warning' ? 'var(--warning)' : 'var(--danger)',
                    transition: 'width 1s ease-in-out',
                    boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                  }} />
                </div>
              </div>

              {canEdit && (
                <button 
                  className={`btn ${isOverdue ? 'btn-danger' : 'btn-primary'}`}
                  style={{ width: '100%', padding: '0.75rem', fontWeight: 600 }}
                  onClick={() => {
                    setSelectedParts([])
                    setManualPartsUsed('')
                    setActiveModalType(s.type)
                  }}
                >
                  ✓ Record {s.type} Service Completed
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Service Completion Modal */}
      {activeModalType && (
        <Modal 
          isOpen={true} 
          onClose={() => setActiveModalType(null)} 
          title={`Record ${activeModalType} Side Service Completed`}
          maxWidth="560px"
        >
          <form onSubmit={handleCompleteService} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Completing this service will log a permanent maintenance record and reset the <strong>{activeModalType}</strong> service interval clock to the service HMR.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Service HMR</label>
                <input 
                  type="number" 
                  step="0.1" 
                  name="serviceHmr" 
                  defaultValue={currentMachineHmr} 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Performed By (Technician)</label>
                <input 
                  type="text" 
                  name="performedBy" 
                  placeholder="e.g. John Doe / Lead Tech" 
                  required 
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Service Description</label>
              <textarea 
                name="description" 
                rows={2} 
                defaultValue={`Completed scheduled maintenance for ${activeModalType} side.`}
                required 
              />
            </div>

            <SparePartUsageSelector
              selectedParts={selectedParts}
              onChange={setSelectedParts}
              manualNotes={manualPartsUsed}
              onManualNotesChange={setManualPartsUsed}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Labor Duration (Hours)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  name="timeSpentHrs" 
                  placeholder="e.g. 2.0" 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Cost ($ / ₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  name="cost" 
                  placeholder="e.g. 350.00" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary mt-2" 
              style={{ width: '100%', padding: '0.75rem' }} 
              disabled={submitting}
            >
              {submitting ? 'Updating Service Clock...' : 'Confirm & Reset Interval Clock'}
            </button>
          </form>
        </Modal>
      )}

      <LowStockAlertModal
        alerts={lowStockAlerts}
        onClose={() => setLowStockAlerts([])}
      />
    </>
  )
}
