"use client"

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import AddMachineModal from '@/components/AddMachineModal'

interface MachineItem {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  type: string
  status: string
  runningHours: number
  subassemblies: Array<{
    id: string
    name: string
    currentHours: number
    lifeExpectancyHours: number
    healthStatus: string
  }>
}

interface DashboardViewProps {
  allMachines: MachineItem[]
  initialModule: 'shovels' | 'drills'
  canEdit: boolean
}

export default function DashboardView({
  allMachines,
  initialModule,
  canEdit
}: DashboardViewProps) {
  const [activeModule, setActiveModule] = useState<'shovels' | 'drills'>(initialModule)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'attention'>('all')

  const shovels = useMemo(() => allMachines.filter(m => m.category === 'Shovel'), [allMachines])
  const drills = useMemo(() => allMachines.filter(m => m.category === 'Drill' || !m.category), [allMachines])
  const moduleMachines = activeModule === 'shovels' ? shovels : drills

  const handleTabSwitch = (mod: 'shovels' | 'drills') => {
    setActiveModule(mod)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('module', mod)
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Filtered machines (instant 0ms search & status filter)
  const displayedMachines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return moduleMachines.filter(m => {
      const hasWarning = m.subassemblies.some(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical')
      const needsAttention = m.status !== 'Working' || hasWarning

      if (statusFilter === 'healthy' && needsAttention) return false
      if (statusFilter === 'attention' && !needsAttention) return false

      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        (m.make && m.make.toLowerCase().includes(q)) ||
        (m.capacity && m.capacity.toLowerCase().includes(q))
      )
    })
  }, [moduleMachines, searchQuery, statusFilter])

  return (
    <main style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '1400px', marginInline: 'auto' }}>
      {/* Top Header */}
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#38bdf8',
            marginBottom: '0.3rem'
          }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            RGOCP2 Open-Cast Fleet Operations
          </div>
          <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fleet Command Center
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time machine health, subassembly wear tracking, and service readiness
          </p>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <AddMachineModal
              defaultCategory={activeModule === 'shovels' ? 'Shovel' : 'Drill'}
              buttonLabel="+ Add Equipment"
            />
          </div>
        )}
      </div>

      {/* Segmented Module Switcher + Search/Filter Toolbar */}
      <div className="glass-panel mb-6" style={{ padding: '0.9rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Module Switcher Pills */}
          <div style={{
            display: 'inline-flex',
            gap: '0.4rem',
            padding: '0.3rem',
            borderRadius: '12px',
            background: 'rgba(6, 10, 20, 0.65)',
            border: '1px solid var(--border)'
          }} role="tablist" aria-label="Fleet Category">
            <button
              type="button"
              role="tab"
              aria-selected={activeModule === 'shovels'}
              onClick={() => handleTabSwitch('shovels')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '9px',
                fontSize: '0.92rem',
                fontWeight: activeModule === 'shovels' ? 700 : 500,
                background: activeModule === 'shovels' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                color: activeModule === 'shovels' ? '#f8fafc' : 'var(--text-secondary)',
                border: activeModule === 'shovels' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🚜</span>
              <span>Shovels Module</span>
              <span className="tabular-nums" style={{
                background: activeModule === 'shovels' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                color: activeModule === 'shovels' ? '#060a14' : '#cbd5e1',
                borderRadius: '999px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                {shovels.length}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeModule === 'drills'}
              onClick={() => handleTabSwitch('drills')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.55rem 1.15rem',
                borderRadius: '9px',
                fontSize: '0.92rem',
                fontWeight: activeModule === 'drills' ? 700 : 500,
                background: activeModule === 'drills' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                color: activeModule === 'drills' ? '#f8fafc' : 'var(--text-secondary)',
                border: activeModule === 'drills' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span>🛠️</span>
              <span>Drills Module</span>
              <span className="tabular-nums" style={{
                background: activeModule === 'drills' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                color: activeModule === 'drills' ? '#060a14' : '#cbd5e1',
                borderRadius: '999px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                {drills.length}
              </span>
            </button>
          </div>

          {/* Search & Status Filter */}
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
            <input
              type="search"
              aria-label="Filter equipment"
              placeholder={`Search ${activeModule === 'shovels' ? 'T2, B1, EX1200...' : 'DM11, IDM30, REL650...'}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                margin: 0,
                width: 'min(100%, 240px)',
                padding: '0.48rem 0.85rem',
                fontSize: '0.85rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {(['all', 'healthy', 'attention'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: statusFilter === f ? 600 : 500,
                    cursor: 'pointer',
                    background: statusFilter === f ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)',
                    color: statusFilter === f ? '#38bdf8' : 'var(--text-secondary)',
                    border: statusFilter === f ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border)'
                  }}
                >
                  {f === 'all' ? 'All' : f === 'healthy' ? 'Healthy' : 'Attention'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Cards Grid */}
      {displayedMachines.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>No matching equipment</div>
          <p className="text-sm" style={{ margin: 0 }}>Try clearing your search filter or switching fleet modules.</p>
        </div>
      ) : (
        <div className="grid-dashboard">
          {displayedMachines.map((machine) => {
            const isWarning = machine.subassemblies.some(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical');
            const badgeClass = machine.status === 'Working' && !isWarning ? 'success' : isWarning || machine.status === 'Under Maintenance' ? 'warning' : 'danger';
            const topAccent = badgeClass === 'success' ? '#10b981' : badgeClass === 'warning' ? '#f59e0b' : '#f43f5e';

            return (
              <Link href={`/machines/${machine.id}`} key={machine.id} style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
                <div
                  className="glass-card-interactive"
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: `2px solid ${topAccent}`
                  }}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex-between mb-2" style={{ gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                        <span style={{ fontSize: '1.35rem' }} aria-hidden="true">
                          {machine.category === 'Shovel' ? '🚜' : '🛠️'}
                        </span>
                        <h2 style={{ margin: 0, fontSize: '1.45rem', color: '#f8fafc', fontWeight: 700 }}>{machine.name}</h2>
                      </div>
                      <span className={`badge ${badgeClass}`}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} aria-hidden="true" />
                        {machine.status}
                      </span>
                    </div>

                    {/* Make / Model / Capacity */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      {machine.make && <strong style={{ color: '#cbd5e1' }}>{machine.make}</strong>}
                      <span>{machine.model}</span>
                      {machine.capacity && (
                        <span style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          borderRadius: '6px',
                          padding: '0.1rem 0.45rem',
                          fontSize: '0.74rem',
                          fontWeight: 600
                        }}>
                          {machine.capacity}
                        </span>
                      )}
                    </div>

                    {/* Subassembly Mini Health Meters */}
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', marginBottom: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Subassemblies Health
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {machine.subassemblies.slice(0, 4).map(sub => {
                        const pct = sub.lifeExpectancyHours > 0
                          ? Math.min(100, Math.max(0, 100 - (sub.currentHours / sub.lifeExpectancyHours) * 100))
                          : 100
                        const barColor = sub.healthStatus === 'Good' ? '#10b981' : sub.healthStatus === 'Warning' ? '#f59e0b' : '#f43f5e'
                        return (
                          <div key={sub.id}>
                            <div className="flex-between" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>
                              <span style={{ color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                {sub.name}
                              </span>
                              <span style={{ color: barColor, fontWeight: 600, fontSize: '0.74rem' }}>
                                {sub.healthStatus}
                              </span>
                            </div>
                            <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '999px' }} />
                            </div>
                          </div>
                        )
                      })}
                      {machine.subassemblies.length > 4 && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.76rem', marginTop: '0.1rem' }}>
                          + {machine.subassemblies.length - 4} more component{machine.subassemblies.length - 4 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Running HMR
                      </div>
                      <strong className="tabular-nums" style={{ fontSize: '1.15rem', color: '#38bdf8' }}>
                        {machine.runningHours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                      Inspect &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
