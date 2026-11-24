"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Modal from './Modal'

export interface MachineWithSchedule {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  runningHours: number
  scheduledMaintenances: Array<{
    id: string
    type: string
    intervalHrs: number
    lastMaintenanceDate: string | Date
    lastMaintenanceHmr: number
  }>
  subassemblies?: Array<any>
}

interface HmrRegisterTableProps {
  machines: MachineWithSchedule[]
  activeModule: 'shovels' | 'drills'
  canEdit: boolean
  onCompletionAdded?: () => void
}

const COMMON_FITTERS = [
  'Asari Mahesh',
  'Raj kumar',
  'Mande Srinivas',
  'M Narsingam'
]

export default function HmrRegisterTable({
  machines,
  activeModule,
  canEdit,
  onCompletionAdded
}: HmrRegisterTableProps) {
  // Local state for machine HMRs to allow instant typing & recalculation
  const [localHmr, setLocalHmr] = useState<{ [machineId: string]: number }>({})
  const [saveStatus, setSaveStatus] = useState<{ [machineId: string]: 'idle' | 'saving' | 'saved' | 'error' }>({})
  const [filter, setFilter] = useState<'all' | 'more50' | 'within50' | 'due' | 'notConfigured'>('all')

  // Completion Modal State
  const [completingMachine, setCompletingMachine] = useState<MachineWithSchedule | null>(null)
  const [fitterName, setFitterName] = useState('')
  const [completionHmr, setCompletionHmr] = useState<number>(0)
  const [completionInterval, setCompletionInterval] = useState<number>(250)
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [completionNotes, setCompletionNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completionError, setCompletionError] = useState('')

  // Debounce timers map
  const debounceTimers = useRef<{ [machineId: string]: NodeJS.Timeout }>({})

  // Initialize local HMR state from props
  useEffect(() => {
    const initialHmrMap: { [id: string]: number } = {}
    machines.forEach(m => {
      initialHmrMap[m.id] = m.runningHours
    })
    setLocalHmr(initialHmrMap)
  }, [machines])

  // Helper to extract primary scheduled maintenance (Engine)
  const getPrimarySchedule = (m: MachineWithSchedule) => {
    return m.scheduledMaintenances?.find(s => s.type === 'Engine') || m.scheduledMaintenances?.[0]
  }

  // Handle live HMR input change with debounce auto-save
  const handleHmrChange = (machineId: string, value: string) => {
    const num = parseFloat(value)
    if (isNaN(num)) return

    setLocalHmr(prev => ({ ...prev, [machineId]: num }))
    setSaveStatus(prev => ({ ...prev, [machineId]: 'saving' }))

    // Clear existing timer
    if (debounceTimers.current[machineId]) {
      clearTimeout(debounceTimers.current[machineId])
    }

    // Debounce save by 600ms
    debounceTimers.current[machineId] = setTimeout(async () => {
      try {
        const res = await fetch(`/api/machines/${machineId}/hmr`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runningHours: num })
        })

        if (res.ok) {
          setSaveStatus(prev => ({ ...prev, [machineId]: 'saved' }))
          setTimeout(() => {
            setSaveStatus(prev => ({ ...prev, [machineId]: 'idle' }))
          }, 2500)
        } else {
          setSaveStatus(prev => ({ ...prev, [machineId]: 'error' }))
        }
      } catch (err) {
        console.error('Auto-save failed:', err)
        setSaveStatus(prev => ({ ...prev, [machineId]: 'error' }))
      }
    }, 600)
  }

  // Open completion modal
  const handleOpenCompletion = (m: MachineWithSchedule) => {
    const schedule = getPrimarySchedule(m)
    const currentVal = localHmr[m.id] !== undefined ? localHmr[m.id] : m.runningHours
    setCompletingMachine(m)
    setCompletionHmr(currentVal)
    setCompletionInterval(schedule?.intervalHrs || (activeModule === 'shovels' ? 500 : 250))
    setFitterName(COMMON_FITTERS[0])
    setCompletionNotes(`Engine Scheduled Maintenance (${schedule?.intervalHrs || 250}h)`)
    setCompletionDate(new Date().toISOString().slice(0, 10))
    setCompletionError('')
  }

  // Submit completion
  const handleSaveCompletion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!completingMachine) return

    setIsSubmitting(true)
    setCompletionError('')

    try {
      const res = await fetch(`/api/machines/${completingMachine.id}/complete-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fitterName,
          serviceHmr: completionHmr,
          interval: completionInterval,
          type: 'Engine',
          description: completionNotes,
          date: new Date(completionDate).toISOString()
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to record completion')
      }

      // Update machine schedule in place
      const schedule = getPrimarySchedule(completingMachine)
      if (schedule) {
        schedule.lastMaintenanceHmr = completionHmr
        schedule.intervalHrs = completionInterval
        schedule.lastMaintenanceDate = new Date(completionDate)
      }

      setCompletingMachine(null)
      if (onCompletionAdded) {
        onCompletionAdded()
      }
    } catch (err: any) {
      setCompletionError(err.message || 'Error recording completion')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate table rows with live math
  const processedRows = machines.map(m => {
    const schedule = getPrimarySchedule(m)
    const lastHmr = schedule ? schedule.lastMaintenanceHmr : 0
    const interval = schedule ? schedule.intervalHrs : (activeModule === 'shovels' ? 500 : 250)
    const currentHmr = localHmr[m.id] !== undefined ? localHmr[m.id] : m.runningHours
    const usedHours = currentHmr - lastHmr
    const hoursDue = lastHmr + interval - currentHmr
    const isConfigured = !!schedule

    return {
      machine: m,
      schedule,
      lastHmr,
      currentHmr,
      interval,
      usedHours,
      hoursDue,
      isConfigured
    }
  })

  // Filter rows
  const filteredRows = processedRows.filter(row => {
    if (filter === 'all') return true
    if (filter === 'more50') return row.isConfigured && row.hoursDue > 50
    if (filter === 'within50') return row.isConfigured && row.hoursDue > 0 && row.hoursDue <= 50
    if (filter === 'due') return row.isConfigured && row.hoursDue <= 0
    if (filter === 'notConfigured') return !row.isConfigured
    return true
  })

  // Export CSV function
  const handleExportCsv = () => {
    const headers = [
      activeModule === 'shovels' ? 'SHOVEL' : 'DRILL',
      'MODEL',
      'BUCKET / CAPACITY',
      'LAST HMR',
      'CURRENT HMR',
      'INTERVAL',
      'USED HRS',
      'HOURS DUE',
      'STATUS'
    ]

    const csvData = filteredRows.map(r => [
      `"${r.machine.name}"`,
      `"${r.machine.model}"`,
      `"${r.machine.capacity || ''}"`,
      r.lastHmr.toFixed(1),
      r.currentHmr.toFixed(1),
      r.interval,
      r.usedHours.toFixed(2),
      r.hoursDue.toFixed(2),
      `"${r.hoursDue <= 0 ? 'OVERDUE' : 'HEALTHY'}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvData.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `HMR_Register_${activeModule}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Summary Counts
  const totalCount = machines.length
  const updatedCount = machines.filter(m => m.runningHours > 0).length
  const recordedCount = processedRows.filter(r => r.isConfigured && r.lastHmr > 0).length
  const notConfiguredCount = processedRows.filter(r => !r.isConfigured).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards Row: Maintenance at a glance */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <span>Maintenance at a glance</span>
          </h2>
          <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.8rem' }}>
            {totalCount} {activeModule === 'shovels' ? 'hydraulic shovels' : 'blast hole drills'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Total {activeModule === 'shovels' ? 'shovels' : 'drills'}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'Outfit, sans-serif' }}>
              {totalCount}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              HMR updated
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'Outfit, sans-serif' }}>
              {updatedCount}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Last service recorded
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', fontFamily: 'Outfit, sans-serif' }}>
              {recordedCount}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Not configured
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: notConfiguredCount > 0 ? '#f43f5e' : '#94a3b8', fontFamily: 'Outfit, sans-serif' }}>
              {notConfiguredCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Register Container */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px' }}>
        {/* Table Title & Formula Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', margin: '0 0 0.35rem 0', fontWeight: 700, color: '#f8fafc' }}>
              {activeModule === 'shovels' ? '🚜 Shovels' : '🛠️ Drills'} HMR Register
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              {activeModule === 'shovels' 
                ? 'EX1200/SANY 500h; BE1000/PC450/EX200 250h. Hours due = Last HMR + Interval - Current HMR.'
                : 'IDM30 / REL650: 250h Engine, 500h Compressor, 1000h Hydraulic. Hours due = Last HMR + Interval - Current HMR.'
              }
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={handleExportCsv}
              className="btn"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.05)' }}
            >
              ↓ Export CSV
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
              }}
              className="btn"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.05)' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: filter === 'all' ? 700 : 500,
              border: filter === 'all' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filter === 'all' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'all' ? '#38bdf8' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Show All ({processedRows.length})
          </button>

          <button
            onClick={() => setFilter('more50')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: filter === 'more50' ? 700 : 500,
              border: filter === 'more50' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filter === 'more50' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'more50' ? '#34d399' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            More than 50h left ({processedRows.filter(r => r.isConfigured && r.hoursDue > 50).length})
          </button>

          <button
            onClick={() => setFilter('within50')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: filter === 'within50' ? 700 : 500,
              border: filter === 'within50' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filter === 'within50' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'within50' ? '#fbbf24' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Within 50h ({processedRows.filter(r => r.isConfigured && r.hoursDue > 0 && r.hoursDue <= 50).length})
          </button>

          <button
            onClick={() => setFilter('due')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: filter === 'due' ? 700 : 500,
              border: filter === 'due' ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filter === 'due' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'due' ? '#fb7185' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Due or overdue ({processedRows.filter(r => r.isConfigured && r.hoursDue <= 0).length})
          </button>

          <button
            onClick={() => setFilter('notConfigured')}
            style={{
              padding: '0.45rem 1rem',
              borderRadius: '999px',
              fontSize: '0.85rem',
              fontWeight: filter === 'notConfigured' ? 700 : 500,
              border: filter === 'notConfigured' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              background: filter === 'notConfigured' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
              color: filter === 'notConfigured' ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Not configured ({notConfiguredCount})
          </button>
        </div>

        {/* Live HMR Register Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '880px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem' }}>{activeModule === 'shovels' ? 'SHOVEL' : 'DRILL'}</th>
                <th style={{ padding: '0.75rem 1rem' }}>MODEL</th>
                <th style={{ padding: '0.75rem 1rem' }}>BUCKET / CAPACITY</th>
                <th style={{ padding: '0.75rem 1rem' }}>LAST HMR</th>
                <th style={{ padding: '0.75rem 1rem', minWidth: '170px' }}>CURRENT HMR</th>
                <th style={{ padding: '0.75rem 1rem' }}>INTERVAL</th>
                <th style={{ padding: '0.75rem 1rem' }}>USED HRS</th>
                <th style={{ padding: '0.75rem 1rem' }}>HOURS DUE</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No equipment matches the selected filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map(({ machine, lastHmr, currentHmr, interval, usedHours, hoursDue, isConfigured }) => {
                  const status = saveStatus[machine.id] || 'idle'
                  const isOverdue = isConfigured && hoursDue <= 0
                  const isDueSoon = isConfigured && hoursDue > 0 && hoursDue <= 50

                  return (
                    <tr
                      key={machine.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name / Link */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <Link
                          href={`/machines/${machine.id}`}
                          style={{
                            color: '#38bdf8',
                            fontWeight: 700,
                            textDecoration: 'none',
                            fontSize: '1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                          }}
                        >
                          <span>{machine.name}</span>
                        </Link>
                      </td>

                      {/* Model */}
                      <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontWeight: 500 }}>
                        {machine.model}
                      </td>

                      {/* Capacity / Bucket */}
                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                        {machine.capacity || (activeModule === 'shovels' ? '5.0 Cu.M' : '150mm')}
                      </td>

                      {/* Last HMR */}
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'Outfit, monospace', color: '#cbd5e1' }}>
                        {lastHmr.toFixed(0)}
                      </td>

                      {/* Current HMR (Interactive with Auto-Save) */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <input
                            type="number"
                            step="0.1"
                            value={currentHmr}
                            onChange={(e) => handleHmrChange(machine.id, e.target.value)}
                            disabled={!canEdit}
                            style={{
                              margin: 0,
                              padding: '0.45rem 0.65rem',
                              fontSize: '0.95rem',
                              fontFamily: 'Outfit, monospace',
                              fontWeight: 600,
                              background: 'rgba(0, 0, 0, 0.35)',
                              border: status === 'saving' 
                                ? '1px solid #f59e0b' 
                                : status === 'saved' 
                                ? '1px solid #10b981' 
                                : '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: '8px',
                              width: '130px',
                              color: '#fff'
                            }}
                          />
                          <div style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {status === 'saving' && (
                              <span style={{ color: '#fbbf24' }}>● Saving...</span>
                            )}
                            {status === 'saved' && (
                              <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Auto-saved</span>
                            )}
                            {status === 'idle' && (
                              <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>Auto-save</span>
                            )}
                            {status === 'error' && (
                              <span style={{ color: '#fb7185' }}>⚠ Save failed</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Interval */}
                      <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                        {interval}
                      </td>

                      {/* Used Hrs */}
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'Outfit, monospace', color: '#e2e8f0', fontWeight: 500 }}>
                        {usedHours.toFixed(2)}
                      </td>

                      {/* Hours Due */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {!isConfigured ? (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            Not configured
                          </span>
                        ) : isOverdue ? (
                          <span style={{ color: '#f43f5e', fontWeight: 700, fontFamily: 'Outfit, monospace', fontSize: '0.95rem' }}>
                            {Math.abs(hoursDue).toFixed(2)} overdue
                          </span>
                        ) : isDueSoon ? (
                          <span style={{ color: '#fbbf24', fontWeight: 600, fontFamily: 'Outfit, monospace', fontSize: '0.95rem' }}>
                            {hoursDue.toFixed(2)} hrs left
                          </span>
                        ) : (
                          <span style={{ color: '#34d399', fontWeight: 600, fontFamily: 'Outfit, monospace', fontSize: '0.95rem' }}>
                            {hoursDue.toFixed(2)} hrs left
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                          <button
                            onClick={() => handleOpenCompletion(machine)}
                            className="btn"
                            disabled={!canEdit}
                            style={{
                              padding: '0.35rem 0.85rem',
                              fontSize: '0.82rem',
                              borderRadius: '8px',
                              background: isOverdue ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.1)',
                              color: isOverdue ? '#fb7185' : '#38bdf8',
                              border: isOverdue ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                              cursor: canEdit ? 'pointer' : 'not-allowed'
                            }}
                          >
                            Pending ▾
                          </button>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.7 }}>
                            Auto-save
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Completion Modal */}
      {completingMachine && (
        <Modal
          isOpen={!!completingMachine}
          onClose={() => setCompletingMachine(null)}
          title={`Record Service Completion — ${completingMachine.name}`}
        >
          {completionError && (
            <div className="badge danger mb-4" style={{ display: 'block' }}>
              {completionError}
            </div>
          )}

          <form onSubmit={handleSaveCompletion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Equipment Details:</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginTop: '0.25rem' }}>
                {completingMachine.name} &bull; {completingMachine.model} ({completingMachine.capacity || 'Standard'})
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Completion HMR *</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={completionHmr}
                  onChange={(e) => setCompletionHmr(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <label>Interval (Hours) *</label>
                <input
                  type="number"
                  required
                  value={completionInterval}
                  onChange={(e) => setCompletionInterval(parseInt(e.target.value) || 250)}
                />
              </div>
            </div>

            <div>
              <label>Fitter / Mechanic Name *</label>
              <input
                type="text"
                list="fitters-list"
                required
                value={fitterName}
                onChange={(e) => setFitterName(e.target.value)}
                placeholder="e.g. Asari Mahesh, Raj kumar..."
              />
              <datalist id="fitters-list">
                {COMMON_FITTERS.map((f, idx) => (
                  <option key={idx} value={f} />
                ))}
              </datalist>
            </div>

            <div>
              <label>Completion Date</label>
              <input
                type="date"
                required
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
              />
            </div>

            <div>
              <label>Service Description & Notes</label>
              <input
                type="text"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Work done, filters replaced, oil changed..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCompletingMachine(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Recording...' : '✓ Mark Service Completed'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
