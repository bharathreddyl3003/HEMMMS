"use client"

import React, { useState } from 'react'
import Link from 'next/link'

export interface ProcessedMachineStatus {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  serialNumber?: string | null
  runningHours: number
  isShovel: boolean
  engineLeft: number | null
  compressorLeft: number | null
  hydraulicLeft: number | null
  engineStatus: string
  compressorStatus: string
  hydraulicStatus: string
  minHoursLeft: number
}

interface MaintenanceStatusViewProps {
  initialMachines: ProcessedMachineStatus[]
  totalMachinesCount: number
  initialFilter?: 'all' | 'shovels' | 'drills'
}

export default function MaintenanceStatusView({
  initialMachines,
  totalMachinesCount,
  initialFilter = 'all'
}: MaintenanceStatusViewProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'shovels' | 'drills'>(initialFilter)

  const handleFilterChange = (filter: 'all' | 'shovels' | 'drills') => {
    setActiveFilter(filter)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('module', filter)
      window.history.replaceState({}, '', url.toString())
    }
  }

  // Filter in memory with zero network delay
  const displayedMachines = initialMachines.filter(m => {
    if (activeFilter === 'shovels') return m.category === 'Shovel'
    if (activeFilter === 'drills') return m.category === 'Drill' || !m.category
    return true
  })

  const overdueCount = displayedMachines.filter(m => m.minHoursLeft <= 0).length
  const dueSoonCount = displayedMachines.filter(m => m.minHoursLeft > 0 && m.minHoursLeft <= 50).length

  const shovelsCount = initialMachines.filter(m => m.category === 'Shovel').length
  const drillsCount = initialMachines.filter(m => m.category === 'Drill' || !m.category).length

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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/hmr-register" className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
            📋 HMR Register
          </Link>
          <Link href="/" className="btn btn-secondary">
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Module Filter Tabs (Instant 0ms switching) */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleFilterChange('all')}
          className={`btn ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
        >
          All Fleet ({totalMachinesCount})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('shovels')}
          className={`btn ${activeFilter === 'shovels' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
        >
          🚜 Shovels ({shovelsCount})
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange('drills')}
          className={`btn ${activeFilter === 'drills' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '0.9rem', padding: '0.45rem 1rem', cursor: 'pointer' }}
        >
          🛠️ Drills ({drillsCount})
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Filtered Fleet Units</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)' }}>
            {displayedMachines.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
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
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Engine Side (250h/500h)</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Compressor Side (500h)</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Hydraulic Side (1000h)</th>
              <th style={{ padding: '1.25rem 1rem', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayedMachines.map((m, idx) => (
              <tr 
                key={m.id} 
                style={{ 
                  borderBottom: idx === displayedMachines.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)',
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
            {displayedMachines.length === 0 && (
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
    return (
      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
        Not Set
      </span>
    )
  }

  const badgeClass = status === 'danger' ? 'danger' : status === 'warning' ? 'warning' : 'success'
  const isOverdue = hoursLeft <= 0

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
      <span className={`badge ${badgeClass}`} style={{ fontWeight: 600 }}>
        {isOverdue ? `${Math.abs(hoursLeft).toFixed(1)}h Overdue` : `${hoursLeft.toFixed(1)}h Left`}
      </span>
    </div>
  )
}
