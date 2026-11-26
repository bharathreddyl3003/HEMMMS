"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import type { ProcessedMachineStatus } from '@/lib/maintenance-status'

export type { ProcessedMachineStatus }

interface MaintenanceStatusViewProps {
  initialMachines: ProcessedMachineStatus[]
  totalMachinesCount: number
  initialFilter?: 'all' | 'shovels' | 'drills'
  embedded?: boolean
}

export default function MaintenanceStatusView({
  initialMachines,
  totalMachinesCount,
  initialFilter = 'all',
  embedded = false
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

  const displayedMachines = initialMachines.filter(m => {
    if (activeFilter === 'shovels') return m.category === 'Shovel'
    if (activeFilter === 'drills') return m.category === 'Drill' || !m.category
    return true
  })

  const overdueCount = displayedMachines.filter(m => m.minHoursLeft <= 0).length
  const dueSoonCount = displayedMachines.filter(m => m.minHoursLeft > 0 && m.minHoursLeft <= 50).length

  const shovelsCount = initialMachines.filter(m => m.category === 'Shovel').length
  const drillsCount = initialMachines.filter(m => m.category === 'Drill' || !m.category).length

  const Container = embedded ? 'div' : 'main'

  return (
    <Container style={embedded ? undefined : { maxWidth: '1400px', margin: '0 auto', padding: '1.75rem 1.5rem 3rem' }}>
      {!embedded && (
        <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#38bdf8',
              marginBottom: '0.3rem'
            }}>
              Preventive Interval Matrix
            </div>
            <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Fleet Maintenance Status
            </h1>
            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Real-time scheduled service tracking sorted by highest urgency first
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/hmr-register"
              className="btn"
              style={{
                background: 'rgba(56, 189, 248, 0.14)',
                color: '#38bdf8',
                borderColor: 'rgba(56, 189, 248, 0.35)',
                fontWeight: 600
              }}
            >
              📋 HMR Register
            </Link>
            <Link href="/" className="btn btn-secondary">
              &larr; Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Segmented Module Filter Tabs (0ms) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          role="tablist"
          aria-label="Filter Maintenance by Fleet Category"
          style={{
            display: 'inline-flex',
            gap: '0.4rem',
            padding: '0.3rem',
            borderRadius: '12px',
            background: 'rgba(6, 10, 20, 0.65)',
            border: '1px solid var(--border)',
            flexWrap: 'wrap'
          }}
        >
          {[
            { key: 'all' as const, label: `All Fleet`, count: totalMachinesCount },
            { key: 'shovels' as const, label: `🚜 Shovels`, count: shovelsCount },
            { key: 'drills' as const, label: `🛠️ Drills`, count: drillsCount }
          ].map(tab => {
            const active = activeFilter === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleFilterChange(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1.05rem',
                  borderRadius: '9px',
                  fontSize: '0.9rem',
                  fontWeight: active ? 700 : 500,
                  background: active ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
                  color: active ? '#f8fafc' : 'var(--text-secondary)',
                  border: active ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span className="tabular-nums" style={{
                  background: active ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                  color: active ? '#060a14' : '#cbd5e1',
                  borderRadius: '999px',
                  padding: '0.08rem 0.45rem',
                  fontSize: '0.73rem',
                  fontWeight: 700
                }}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', borderInlineStart: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Filtered Fleet Units
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, marginTop: '0.35rem', color: 'var(--text-primary)' }} className="tabular-nums">
            {displayedMachines.length} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', borderInlineStart: `3px solid ${overdueCount > 0 ? '#f43f5e' : '#10b981'}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Overdue Services
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, marginTop: '0.35rem', color: overdueCount > 0 ? '#fb7185' : '#34d399' }} className="tabular-nums">
            {overdueCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.15rem 1.25rem', borderInlineStart: `3px solid ${dueSoonCount > 0 ? '#f59e0b' : '#10b981'}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Due in &lt; 50 Hours
          </div>
          <div style={{ fontSize: '1.9rem', fontWeight: 700, marginTop: '0.35rem', color: dueSoonCount > 0 ? '#fbbf24' : '#34d399' }} className="tabular-nums">
            {dueSoonCount} <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 400 }}>Units</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div tabIndex={0} role="region" aria-label="Fleet Maintenance Status Matrix" className="table-wrapper" style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}>
          <table className="hemmms-table" style={{ minWidth: '880px' }}>
            <thead>
              <tr>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Equipment</th>
                <th scope="col" style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Current HMR</th>
                <th scope="col" style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Engine Side (250h/500h)</th>
                <th scope="col" style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Compressor Side (500h)</th>
                <th scope="col" style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>Hydraulic Side (1000h)</th>
                <th scope="col" style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {displayedMachines.map((m) => (
                <tr
                  key={m.id}
                  style={{
                    background: m.minHoursLeft <= 0 ? 'rgba(244, 63, 94, 0.04)' : undefined,
                    boxShadow: m.minHoursLeft <= 0 ? 'inset 3px 0 0 #f43f5e' : m.minHoursLeft <= 50 ? 'inset 3px 0 0 #f59e0b' : undefined
                  }}
                >
                  <th scope="row" style={{ padding: '0.95rem 1rem', textAlign: 'left', fontWeight: 500 }}>
                    <Link href={`/machines/${m.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span aria-hidden="true">{m.isShovel ? '🚜' : '🛠️'}</span>
                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#38bdf8' }}>{m.name}</span>
                        {m.capacity && (
                          <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', borderRadius: '6px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', fontWeight: 600 }}>
                            {m.capacity}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                        {m.make ? `${m.make} ` : ''}{m.model} {m.serialNumber ? `• S/N: ${m.serialNumber}` : ''}
                      </div>
                    </Link>
                  </th>
                  <td style={{ padding: '0.95rem 1rem', textAlign: 'center' }}>
                    <span className="tabular-nums" style={{ fontWeight: 600, color: '#f8fafc' }}>
                      {m.runningHours.toFixed(1)} hrs
                    </span>
                  </td>
                  <td style={{ padding: '0.95rem 1rem', textAlign: 'center' }}>
                    <StatusCell hoursLeft={m.engineLeft} status={m.engineStatus} />
                  </td>
                  <td style={{ padding: '0.95rem 1rem', textAlign: 'center' }}>
                    {m.isShovel ? (
                      <span style={{
                        padding: '0.3rem 0.65rem',
                        color: '#64748b',
                        fontSize: '0.74rem',
                        fontStyle: 'italic',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '999px'
                      }}>
                        N/A (Shovel)
                      </span>
                    ) : (
                      <StatusCell hoursLeft={m.compressorLeft} status={m.compressorStatus} />
                    )}
                  </td>
                  <td style={{ padding: '0.95rem 1rem', textAlign: 'center' }}>
                    <StatusCell hoursLeft={m.hydraulicLeft} status={m.hydraulicStatus} />
                  </td>
                  <td style={{ padding: '0.95rem 1rem', textAlign: 'right' }}>
                    <Link
                      href={`/machines/${m.id}?tab=scheduled`}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.38rem 0.85rem', minBlockSize: '32px' }}
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
    </Container>
  )
}

function StatusCell({ hoursLeft, status }: { hoursLeft: number | null, status: string }) {
  if (hoursLeft === null) {
    return (
      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
        Not Set
      </span>
    )
  }

  const badgeClass = status === 'danger' ? 'danger' : status === 'warning' ? 'warning' : 'success'
  const isOverdue = hoursLeft <= 0

  return (
    <span className={`badge ${badgeClass} tabular-nums`}>
      {isOverdue ? `${Math.abs(hoursLeft).toFixed(1)}h Overdue` : `${hoursLeft.toFixed(1)}h Left`}
    </span>
  )
}
