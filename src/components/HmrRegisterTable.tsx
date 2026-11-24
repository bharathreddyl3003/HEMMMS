"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Modal from './Modal'
import SparePartUsageSelector, { SparePartOption, SelectedSpareUsage } from './SparePartUsageSelector'
import LowStockAlertModal from './LowStockAlertModal'
import type { LowStockAlert } from '@/lib/spares'

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
  spareParts?: SparePartOption[]
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
  spareParts = [],
  onCompletionAdded
}: HmrRegisterTableProps) {
  // Local state for machine HMRs to allow instant typing & recalculation
  const [localHmr, setLocalHmr] = useState<{ [machineId: string]: number }>({})
  const [saveStatus, setSaveStatus] = useState<{ [machineId: string]: 'idle' | 'saving' | 'saved' | 'error' }>({})
  const [filter, setFilter] = useState<'all' | 'more50' | 'within50' | 'due' | 'notConfigured'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Completion Modal State
  const [completingMachine, setCompletingMachine] = useState<MachineWithSchedule | null>(null)
  const [fitterName, setFitterName] = useState('')
  const [completionHmr, setCompletionHmr] = useState<number>(0)
  const [completionInterval, setCompletionInterval] = useState<number>(250)
  const [completionDate, setCompletionDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [completionNotes, setCompletionNotes] = useState('')
  const [selectedParts, setSelectedParts] = useState<SelectedSpareUsage[]>([])
  const [manualPartsUsed, setManualPartsUsed] = useState('')
  const [availableSpares, setAvailableSpares] = useState<SparePartOption[]>(spareParts)
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([])
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
    setSelectedParts([])
    setManualPartsUsed('')
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
          date: new Date(completionDate).toISOString(),
          partsUsed: manualPartsUsed,
          deductedParts: selectedParts
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record completion')
      }

      // Update local spare stock quantities immediately
      if (selectedParts.length > 0) {
        setAvailableSpares(prev =>
          prev.map(sp => {
            const used = selectedParts.find(p => p.sparePartId === sp.id)
            return used ? { ...sp, stockQuantity: Math.max(0, sp.stockQuantity - used.quantity) } : sp
          })
        )
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

      // Show Low Stock Alert Modal if any deducted spare dropped <= reorderLevel
      if (Array.isArray(data.lowStockAlerts) && data.lowStockAlerts.length > 0) {
        setLowStockAlerts(data.lowStockAlerts)
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
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch = !q ||
      row.machine.name.toLowerCase().includes(q) ||
      row.machine.model.toLowerCase().includes(q) ||
      (row.machine.capacity && row.machine.capacity.toLowerCase().includes(q))
    if (!matchesSearch) return false

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

  const overdueCount = processedRows.filter(r => r.isConfigured && r.hoursDue <= 0).length
  const dueSoonCount = processedRows.filter(r => r.isConfigured && r.hoursDue > 0 && r.hoursDue <= 50).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Metric Cards Row: Maintenance at a glance */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <span>Maintenance at a glance</span>
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {overdueCount > 0 && (
              <span className="badge danger tabular-nums">{overdueCount} overdue</span>
            )}
            {dueSoonCount > 0 && (
              <span className="badge warning tabular-nums">{dueSoonCount} within 50h</span>
            )}
            <span className="badge accent tabular-nums">
              {totalCount} {activeModule === 'shovels' ? 'hydraulic shovels' : 'blast hole drills'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #94a3b8' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Total {activeModule === 'shovels' ? 'shovels' : 'drills'}
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#f8fafc' }}>
              {totalCount}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #38bdf8' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              HMR updated
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#38bdf8' }}>
              {updatedCount}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #10b981' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Last service recorded
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.9rem', fontWeight: 700, color: '#34d399' }}>
              {recordedCount}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: `3px solid ${notConfiguredCount > 0 ? '#f43f5e' : '#64748b'}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Not configured
            </div>
            <div className="tabular-nums" style={{ fontSize: '1.9rem', fontWeight: 700, color: notConfiguredCount > 0 ? '#fb7185' : '#94a3b8' }}>
              {notConfiguredCount}
            </div>
          </div>
        </div>
      </div>

      {/* Main Register Container */}
      <div className="glass-panel" style={{ padding: '1.4rem' }}>
        {/* Table Title & Formula Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.15rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.25rem 0', fontWeight: 700, color: '#f8fafc' }}>
              {activeModule === 'shovels' ? '🚜 Shovels' : '🛠️ Drills'} HMR Register
            </h2>
            <div style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
              {activeModule === 'shovels'
                ? 'EX1200/SANY 500h; BE1000/PC450/EX200 250h. Hours due = Last HMR + Interval - Current HMR.'
                : 'IDM30 / REL650: 250h Engine, 500h Compressor, 1000h Hydraulic. Hours due = Last HMR + Interval - Current HMR.'
              }
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleExportCsv}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            >
              ↓ Export CSV
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.reload()
              }}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Filter Pills + Search Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                padding: '0.42rem 0.9rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: filter === 'all' ? 700 : 500,
                border: filter === 'all' ? '1px solid #38bdf8' : '1px solid var(--border)',
                background: filter === 'all' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                color: filter === 'all' ? '#38bdf8' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Show All ({processedRows.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('more50')}
              style={{
                padding: '0.42rem 0.9rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: filter === 'more50' ? 700 : 500,
                border: filter === 'more50' ? '1px solid #10b981' : '1px solid var(--border)',
                background: filter === 'more50' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                color: filter === 'more50' ? '#34d399' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              More than 50h left ({processedRows.filter(r => r.isConfigured && r.hoursDue > 50).length})
            </button>

            <button
              type="button"
              onClick={() => setFilter('within50')}
              style={{
                padding: '0.42rem 0.9rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: filter === 'within50' ? 700 : 500,
                border: filter === 'within50' ? '1px solid #f59e0b' : '1px solid var(--border)',
                background: filter === 'within50' ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                color: filter === 'within50' ? '#fbbf24' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Within 50h ({dueSoonCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter('due')}
              style={{
                padding: '0.42rem 0.9rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: filter === 'due' ? 700 : 500,
                border: filter === 'due' ? '1px solid #f43f5e' : '1px solid var(--border)',
                background: filter === 'due' ? 'rgba(244, 63, 94, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                color: filter === 'due' ? '#fb7185' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Due or overdue ({overdueCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter('notConfigured')}
              style={{
                padding: '0.42rem 0.9rem',
                borderRadius: '999px',
                fontSize: '0.82rem',
                fontWeight: filter === 'notConfigured' ? 700 : 500,
                border: filter === 'notConfigured' ? '1px solid rgba(255,255,255,0.35)' : '1px solid var(--border)',
                background: filter === 'notConfigured' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: filter === 'notConfigured' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              Not configured ({notConfiguredCount})
            </button>
          </div>

          <input
            type="search"
            aria-label="Search register table"
            placeholder="Search ID or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              margin: 0,
              width: 'min(100%, 210px)',
              padding: '0.42rem 0.8rem',
              fontSize: '0.83rem'
            }}
          />
        </div>

        {/* Live HMR Register Table */}
        <div
          tabIndex={0}
          role="region"
          aria-label={`${activeModule === 'shovels' ? 'Shovels' : 'Drills'} HMR Register`}
          className="table-wrapper"
          style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}
        >
          <table className="hemmms-table" style={{ minWidth: '920px' }}>
            <thead>
              <tr>
                <th scope="col" style={{ padding: '0.8rem 1rem' }}>{activeModule === 'shovels' ? 'SHOVEL' : 'DRILL'}</th>
                <th scope="col" style={{ padding: '0.8rem 1rem' }}>MODEL</th>
                <th scope="col" style={{ padding: '0.8rem 1rem' }}>BUCKET / CAPACITY</th>
                <th scope="col" style={{ padding: '0.8rem 1rem' }}>LAST HMR</th>
                <th scope="col" style={{ padding: '0.8rem 1rem', minWidth: '175px' }}>CURRENT HMR</th>
                <th scope="col" style={{ padding: '0.8rem 1rem' }}>INTERVAL</th>
                <th scope="col" style={{ padding: '0.8rem 1rem' }}>USED HRS</th>
                <th scope="col" style={{ padding: '0.8rem 1rem', minWidth: '165px' }}>HOURS DUE</th>
                <th scope="col" style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>ACTION</th>
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
                  const usedPct = interval > 0 ? Math.min(100, Math.max(0, (usedHours / interval) * 100)) : 0
                  const barColor = isOverdue ? '#f43f5e' : isDueSoon ? '#f59e0b' : '#10b981'

                  return (
                    <tr
                      key={machine.id}
                      style={{
                        background: isOverdue ? 'rgba(244, 63, 94, 0.04)' : isDueSoon ? 'rgba(245, 158, 11, 0.03)' : undefined,
                        boxShadow: isOverdue
                          ? 'inset 3px 0 0 #f43f5e'
                          : isDueSoon
                          ? 'inset 3px 0 0 #f59e0b'
                          : undefined
                      }}
                    >
                      {/* Name / Link */}
                      <th scope="row" style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'left' }}>
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
                      </th>

                      {/* Model */}
                      <td style={{ padding: '0.85rem 1rem', color: '#e2e8f0', fontWeight: 500 }}>
                        {machine.model}
                      </td>

                      {/* Capacity / Bucket */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          padding: '0.18rem 0.5rem',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.06)',
                          color: '#cbd5e1',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}>
                          {machine.capacity || (activeModule === 'shovels' ? '5.0 Cu.M' : '150mm')}
                        </span>
                      </td>

                      {/* Last HMR */}
                      <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                        {lastHmr.toFixed(0)}
                      </td>

                      {/* Current HMR (Interactive with Auto-Save) */}
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input
                              type="number"
                              step="0.1"
                              aria-label={`Current HMR for ${machine.name}`}
                              value={currentHmr}
                              onChange={(e) => handleHmrChange(machine.id, e.target.value)}
                              disabled={!canEdit}
                              className="tabular-nums"
                              style={{
                                margin: 0,
                                padding: '0.42rem 0.65rem',
                                fontSize: '0.94rem',
                                fontWeight: 600,
                                background: 'rgba(6, 10, 20, 0.72)',
                                border: status === 'saving'
                                  ? '1px solid #f59e0b'
                                  : status === 'saved'
                                  ? '1px solid #10b981'
                                  : status === 'error'
                                  ? '1px solid #f43f5e'
                                  : '1px solid rgba(148, 163, 184, 0.25)',
                                borderRadius: '8px',
                                width: '126px',
                                color: '#fff'
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.3rem', height: '14px' }}>
                            {status === 'saving' && <span style={{ color: '#fbbf24' }}>● Saving...</span>}
                            {status === 'saved' && <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Auto-saved</span>}
                            {status === 'idle' && <span style={{ color: '#64748b' }}>Auto-save</span>}
                            {status === 'error' && <span style={{ color: '#fb7185' }}>⚠ Save failed</span>}
                          </div>
                        </div>
                      </td>

                      {/* Interval */}
                      <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                        {interval}h
                      </td>

                      {/* Used Hrs */}
                      <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#e2e8f0', fontWeight: 600 }}>
                        {usedHours.toFixed(2)}
                      </td>

                      {/* Hours Due with Cycle Progress Bar */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {!isConfigured ? (
                          <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.84rem' }}>
                            Not configured
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
                            <span
                              className="tabular-nums"
                              style={{
                                color: isOverdue ? '#fb7185' : isDueSoon ? '#fbbf24' : '#34d399',
                                fontWeight: isOverdue ? 700 : 600,
                                fontSize: '0.9rem'
                              }}
                            >
                              {isOverdue ? `${Math.abs(hoursDue).toFixed(2)} overdue` : `${hoursDue.toFixed(2)} hrs left`}
                            </span>
                            <div style={{ width: '115px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                              <div style={{ width: `${usedPct}%`, height: '100%', background: barColor, borderRadius: '999px' }} />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenCompletion(machine)}
                            className="btn"
                            disabled={!canEdit}
                            style={{
                              padding: '0.35rem 0.85rem',
                              minBlockSize: '32px',
                              fontSize: '0.8rem',
                              borderRadius: '8px',
                              background: isOverdue ? 'rgba(244, 63, 94, 0.2)' : 'rgba(56, 189, 248, 0.12)',
                              color: isOverdue ? '#fb7185' : '#38bdf8',
                              borderColor: isOverdue ? 'rgba(244, 63, 94, 0.4)' : 'rgba(56, 189, 248, 0.35)'
                            }}
                          >
                            Pending ▾
                          </button>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Record service
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
          maxWidth="560px"
        >
          {completionError && (
            <div className="badge danger mb-4" style={{ display: 'block' }}>
              {completionError}
            </div>
          )}

          <form onSubmit={handleSaveCompletion} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.2)', marginBottom: '0.75rem' }}>
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

            <SparePartUsageSelector
              initialSpares={availableSpares}
              selectedParts={selectedParts}
              onChange={setSelectedParts}
              manualNotes={manualPartsUsed}
              onManualNotesChange={setManualPartsUsed}
            />

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

      {/* Low Stock Alert & 1-Click PR Modal */}
      <LowStockAlertModal
        alerts={lowStockAlerts}
        onClose={() => setLowStockAlerts([])}
      />
    </div>
  )
}
