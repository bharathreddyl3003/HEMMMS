"use client"

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { MachineWithSchedule } from './HmrRegisterTable'

interface MobileHmrViewProps {
  shovels: MachineWithSchedule[]
  drills: MachineWithSchedule[]
  activeModule: 'shovels' | 'drills'
  canEdit: boolean
}

export default function MobileHmrView({
  shovels,
  drills,
  activeModule: initialModule,
  canEdit
}: MobileHmrViewProps) {
  const [activeModule, setActiveModule] = useState<'shovels' | 'drills'>(initialModule)
  const [searchQuery, setSearchQuery] = useState('')
  const [localHmr, setLocalHmr] = useState<{ [machineId: string]: number }>({})
  const [saveStatus, setSaveStatus] = useState<{ [machineId: string]: 'idle' | 'saving' | 'saved' | 'error' }>({})

  const debounceTimers = useRef<{ [machineId: string]: NodeJS.Timeout }>({})

  const machines = activeModule === 'shovels' ? shovels : drills

  // Initialize local HMR values
  useEffect(() => {
    const map: { [id: string]: number } = {}
    shovels.forEach(m => { map[m.id] = m.runningHours })
    drills.forEach(m => { map[m.id] = m.runningHours })
    setLocalHmr(map)
  }, [shovels, drills])

  const handleHmrChange = (machineId: string, val: string) => {
    const num = parseFloat(val)
    if (isNaN(num)) return

    setLocalHmr(prev => ({ ...prev, [machineId]: num }))
    setSaveStatus(prev => ({ ...prev, [machineId]: 'saving' }))

    if (debounceTimers.current[machineId]) {
      clearTimeout(debounceTimers.current[machineId])
    }

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
        console.error('Mobile auto-save failed:', err)
        setSaveStatus(prev => ({ ...prev, [machineId]: 'error' }))
      }
    }, 600)
  }

  // Filter machines by search query
  const filteredMachines = machines.filter(m => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.model.toLowerCase().includes(q)
  })

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.25rem 1rem 3rem 1rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ 
            fontSize: '0.72rem', 
            fontWeight: 700, 
            letterSpacing: '0.12em', 
            color: '#38bdf8', 
            textTransform: 'uppercase',
            marginBottom: '0.2rem'
          }}>
            FIELD TOOLS
          </div>
          <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#f8fafc' }}>
            Daily HMR Entry
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Tap any machine to update hours. Changes save instantly to the fleet register.
          </p>
        </div>

        <Link
          href="/hmr-register"
          className="btn"
          style={{ 
            padding: '0.5rem 1rem', 
            fontSize: '0.85rem', 
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontWeight: 500
          }}
        >
          Full register ↗
        </Link>
      </div>

      {/* Module Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          onClick={() => setActiveModule('shovels')}
          style={{
            flex: 1,
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: activeModule === 'shovels' ? 700 : 500,
            cursor: 'pointer',
            border: activeModule === 'shovels' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeModule === 'shovels' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeModule === 'shovels' ? '#38bdf8' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🚜</span>
          <span>Shovels ({shovels.length})</span>
        </button>

        <button
          onClick={() => setActiveModule('drills')}
          style={{
            flex: 1,
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            fontSize: '0.95rem',
            fontWeight: activeModule === 'drills' ? 700 : 500,
            cursor: 'pointer',
            border: activeModule === 'drills' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
            background: activeModule === 'drills' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeModule === 'drills' ? '#38bdf8' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }}
        >
          <span>🛠️</span>
          <span>Drills ({drills.length})</span>
        </button>
      </div>

      {/* Quick Search Input */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="🔍 Quick search machine ID or model..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            margin: 0,
            padding: '0.65rem 1rem',
            borderRadius: '12px',
            fontSize: '0.9rem',
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        />
      </div>

      {/* 2-Column Responsive Card Grid (Page 3 of PDF) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1rem' 
      }}>
        {filteredMachines.map(m => {
          const schedule = m.scheduledMaintenances?.find(s => s.type === 'Engine') || m.scheduledMaintenances?.[0]
          const lastHmr = schedule ? schedule.lastMaintenanceHmr : 0
          const interval = schedule ? schedule.intervalHrs : (activeModule === 'shovels' ? 500 : 250)
          const currentVal = localHmr[m.id] !== undefined ? localHmr[m.id] : m.runningHours
          const hoursDue = lastHmr + interval - currentVal
          const isOverdue = schedule && hoursDue <= 0
          const status = saveStatus[m.id] || 'idle'

          return (
            <div
              key={m.id}
              className="glass-panel"
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '16px',
                background: 'rgba(15, 23, 42, 0.7)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                border: isOverdue ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Left Column: Equipment Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'Outfit, sans-serif' }}>
                    {m.name}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.82rem', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.35rem' }}>
                  {m.model} {m.capacity ? `• ${m.capacity}` : ''}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Last: <strong style={{ color: '#cbd5e1' }}>{lastHmr.toFixed(0)}</strong>
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>&bull;</span>
                  <span style={{ color: isOverdue ? '#f43f5e' : '#34d399', fontWeight: 600 }}>
                    {isOverdue ? `${Math.abs(hoursDue).toFixed(0)}h overdue` : `${hoursDue.toFixed(0)}h left`}
                  </span>
                </div>
              </div>

              {/* Right Column: HMR Input & Auto-save */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '135px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                  Current HMR
                </span>
                
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={currentVal}
                  onChange={(e) => handleHmrChange(m.id, e.target.value)}
                  disabled={!canEdit}
                  style={{
                    margin: 0,
                    padding: '0.5rem 0.65rem',
                    fontSize: '1.25rem',
                    fontFamily: 'Outfit, monospace',
                    fontWeight: 700,
                    textAlign: 'right',
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: status === 'saving'
                      ? '1.5px solid #f59e0b'
                      : status === 'saved'
                      ? '1.5px solid #10b981'
                      : '1.5px solid rgba(255, 255, 255, 0.18)',
                    borderRadius: '10px',
                    color: '#fff'
                  }}
                />

                <div style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  {status === 'saving' && <span style={{ color: '#fbbf24' }}>● Saving...</span>}
                  {status === 'saved' && <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Auto-saved</span>}
                  {status === 'idle' && <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>Auto-save</span>}
                  {status === 'error' && <span style={{ color: '#fb7185' }}>⚠ Save failed</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
