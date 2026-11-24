"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

export interface CompletionRecord {
  id: string
  createdAt: string | Date
  description: string
  hmr: number | null
  status: string
  performedBy: string | null
  machine: {
    id: string
    name: string
    model: string
    category: string
    capacity?: string | null
    scheduledMaintenances?: Array<{
      type: string
      intervalHrs: number
      lastMaintenanceHmr: number
    }>
  }
}

interface MaintenanceCompletionRegistryProps {
  initialRecords: CompletionRecord[]
  category?: 'Shovel' | 'Drill'
  refreshTrigger?: number
}

export default function MaintenanceCompletionRegistry({
  initialRecords,
  category,
  refreshTrigger = 0
}: MaintenanceCompletionRegistryProps) {
  const [records, setRecords] = useState<CompletionRecord[]>(initialRecords)
  const [loading, setLoading] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const url = category ? `/api/maintenance/completions?category=${category}` : '/api/maintenance/completions'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records || [])
      }
    } catch (err) {
      console.error('Failed to refresh completion registry:', err)
    } finally {
      setLoading(false)
    }
  }

  // Refetch when trigger or category changes
  useEffect(() => {
    fetchRecords()
  }, [refreshTrigger, category])

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.35rem 0', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋 Maintenance Completion Registry</span>
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Historical log of completed scheduled services and recorded fitter assignments.
          </div>
        </div>

        <button
          onClick={fetchRecords}
          disabled={loading}
          className="btn"
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.05)' }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh registry'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.78rem', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.75rem 1rem' }}>COMPLETED AT</th>
              <th style={{ padding: '0.75rem 1rem' }}>{category === 'Shovel' ? 'SHOVEL' : 'DRILL'}</th>
              <th style={{ padding: '0.75rem 1rem' }}>MODEL</th>
              <th style={{ padding: '0.75rem 1rem' }}>LAST HMR</th>
              <th style={{ padding: '0.75rem 1rem' }}>CURRENT HMR</th>
              <th style={{ padding: '0.75rem 1rem' }}>INTERVAL</th>
              <th style={{ padding: '0.75rem 1rem' }}>USED HRS</th>
              <th style={{ padding: '0.75rem 1rem' }}>DUE HRS</th>
              <th style={{ padding: '0.75rem 1rem' }}>FITTER NAME</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No completed services recorded yet. Completed maintenance will automatically appear here.
                </td>
              </tr>
            ) : (
              records.map(record => {
                const dateObj = new Date(record.createdAt)
                const formattedDate = dateObj.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                }) + ', ' + dateObj.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit'
                })

                const primarySchedule = record.machine.scheduledMaintenances?.find(s => s.type === 'Engine') || record.machine.scheduledMaintenances?.[0]
                const interval = primarySchedule?.intervalHrs || 250
                const currentHmr = record.hmr || 0
                // Last HMR recorded prior
                const lastHmr = primarySchedule?.lastMaintenanceHmr || currentHmr
                const usedHrs = Math.max(0, currentHmr - lastHmr)
                const dueHrs = interval - usedHrs

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Completed At */}
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      {formattedDate}
                    </td>

                    {/* Machine ID */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link
                        href={`/machines/${record.machine.id}`}
                        style={{
                          color: '#38bdf8',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        {record.machine.name}
                      </Link>
                    </td>

                    {/* Model */}
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                      {record.machine.model}
                    </td>

                    {/* Last HMR */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'Outfit, monospace', color: '#94a3b8' }}>
                      {lastHmr.toFixed(0)}
                    </td>

                    {/* Current HMR */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'Outfit, monospace', color: '#f8fafc', fontWeight: 600 }}>
                      {currentHmr.toFixed(1)}
                    </td>

                    {/* Interval */}
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                      {interval}h
                    </td>

                    {/* Used Hrs */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'Outfit, monospace', color: '#cbd5e1' }}>
                      {usedHrs.toFixed(2)}
                    </td>

                    {/* Due Hrs */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'Outfit, monospace', color: '#34d399', fontWeight: 600 }}>
                      {dueHrs.toFixed(2)}
                    </td>

                    {/* Fitter Name */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '0.3rem 0.65rem' }}>
                        {record.performedBy || 'Fitter'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
