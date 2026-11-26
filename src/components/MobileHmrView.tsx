"use client"

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { MachineWithSchedule } from './HmrRegisterTable'

interface MobileHmrViewProps {
  shovels: MachineWithSchedule[]
  drills: MachineWithSchedule[]
  activeModule: 'shovels' | 'drills'
  canEdit: boolean
  embedded?: boolean
  onModuleChange?: (mod: 'shovels' | 'drills') => void
  onHmrUpdated?: (machineId: string, runningHours: number) => void
}

export default function MobileHmrView({
  shovels,
  drills,
  activeModule: initialModule,
  canEdit,
  embedded = false,
  onModuleChange,
  onHmrUpdated
}: MobileHmrViewProps) {
  const [internalModule, setInternalModule] = useState<'shovels' | 'drills'>(initialModule)
  const [searchQuery, setSearchQuery] = useState('')
  const [localHmr, setLocalHmr] = useState<{ [machineId: string]: number }>({})
  const [saveStatus, setSaveStatus] = useState<{ [machineId: string]: 'idle' | 'saving' | 'saved' | 'error' }>({})

  const debounceTimers = useRef<{ [machineId: string]: NodeJS.Timeout }>({})

  const activeModule = onModuleChange ? initialModule : internalModule
  const machines = activeModule === 'shovels' ? shovels : drills

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
          onHmrUpdated?.(machineId, num)
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

  const handleTabSwitch = (mod: 'shovels' | 'drills') => {
    setInternalModule(mod)
    onModuleChange?.(mod)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('module', mod)
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Filter machines by search query
  const filteredMachines = machines.filter(m => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.model.toLowerCase().includes(q)
  })

  return (
    <div style={embedded ? undefined : { maxWidth: '960px', margin: '0 auto', padding: '1.25rem 1rem 3rem 1rem' }}>
      {!embedded && (
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
      )}

      {/* Module Switcher Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => handleTabSwitch('shovels')}
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
          type="button"
          onClick={() => handleTabSwitch('drills')}
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
      <div role="search" style={{ marginBottom: '1.25rem' }}>
        <input
          type="search"
          aria-label="Quick search machine ID or model"
          placeholder="🔍 Quick search machine ID or model..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            margin: 0,
            padding: '0.7rem 1rem',
            minBlockSize: '46px',
            borderRadius: '12px',
            fontSize: '0.95rem',
            background: 'rgba(6, 10, 20, 0.65)',
            border: '1px solid var(--border-strong)'
          }}
        />
      </div>

      {/* 2-Column Responsive Card Grid (Page 3 of PDF) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
        gap: '1rem'
      }}>
        {filteredMachines.map(m => {
          const schedule = m.scheduledMaintenances?.find(s => s.type === 'Engine') || m.scheduledMaintenances?.[0]
          const lastHmr = schedule ? schedule.lastMaintenanceHmr : 0
          const interval = schedule ? schedule.intervalHrs : (activeModule === 'shovels' ? 500 : 250)
          const currentVal = localHmr[m.id] !== undefined ? localHmr[m.id] : m.runningHours
          const hoursDue = lastHmr + interval - currentVal
          const usedPct = interval > 0 ? Math.min(100, Math.max(0, ((currentVal - lastHmr) / interval) * 100)) : 0
          const isOverdue = schedule && hoursDue <= 0
          const isDueSoon = schedule && hoursDue > 0 && hoursDue <= 50
          const status = saveStatus[m.id] || 'idle'
          const accent = isOverdue ? '#f43f5e' : isDueSoon ? '#f59e0b' : '#10b981'

          return (
            <div
              key={m.id}
              className="glass-panel"
              style={{
                padding: '1rem 1.2rem 0.9rem',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                border: isOverdue ? '1px solid rgba(244, 63, 94, 0.4)' : isDueSoon ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--glass-border)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                {/* Left Column: Equipment Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <Link
                      href={`/machines/${m.id}`}
                      style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-heading-stack)', textDecoration: 'none' }}
                    >
                      {m.name}
                    </Link>
                    {m.capacity && (
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.1rem 0.4rem',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.06)',
                        color: '#cbd5e1'
                      }}>
                        {m.capacity}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.35rem' }}>
                    {m.model}
                  </div>

                  <div className="tabular-nums" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.76rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Last: <strong style={{ color: '#cbd5e1' }}>{lastHmr.toFixed(0)}</strong>
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>&bull;</span>
                    <span style={{ color: accent, fontWeight: 700 }}>
                      {isOverdue ? `${Math.abs(hoursDue).toFixed(0)}h overdue` : `${hoursDue.toFixed(0)}h left`}
                    </span>
                  </div>
                </div>

                {/* Right Column: HMR Input & Auto-save */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '142px' }}>
                  <label
                    htmlFor={`mobile-hmr-${m.id}`}
                    style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}
                  >
                    Current HMR
                  </label>

                  <input
                    id={`mobile-hmr-${m.id}`}
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={currentVal}
                    onChange={(e) => handleHmrChange(m.id, e.target.value)}
                    disabled={!canEdit}
                    className="tabular-nums"
                    style={{
                      margin: 0,
                      padding: '0.5rem 0.65rem',
                      minBlockSize: '48px',
                      fontSize: '1.22rem',
                      fontWeight: 700,
                      textAlign: 'right',
                      width: '100%',
                      background: 'rgba(6, 10, 20, 0.75)',
                      border: status === 'saving'
                        ? '1.5px solid #f59e0b'
                        : status === 'saved'
                        ? '1.5px solid #10b981'
                        : status === 'error'
                        ? '1.5px solid #f43f5e'
                        : '1.5px solid rgba(148, 163, 184, 0.25)',
                      borderRadius: '10px',
                      color: '#fff'
                    }}
                  />

                  <div style={{ fontSize: '0.72rem', marginTop: '0.25rem', height: '16px' }}>
                    {status === 'saving' && <span style={{ color: '#fbbf24' }}>● Saving...</span>}
                    {status === 'saved' && <span style={{ color: '#34d399', fontWeight: 600 }}>✓ Auto-saved</span>}
                    {status === 'idle' && <span style={{ color: '#64748b' }}>Auto-save</span>}
                    {status === 'error' && <span style={{ color: '#fb7185' }}>⚠ Save failed</span>}
                  </div>
                </div>
              </div>

              {/* Service Cycle Progress Strip */}
              <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                <div style={{ width: `${usedPct}%`, height: '100%', background: accent, borderRadius: '999px' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
