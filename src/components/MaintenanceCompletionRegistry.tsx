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
  partsUsed?: string | null
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

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function MaintenanceCompletionRegistry({
  initialRecords,
  category,
  refreshTrigger = 0
}: MaintenanceCompletionRegistryProps) {
  const [allRecords, setAllRecords] = useState<CompletionRecord[]>(initialRecords)
  const [loading, setLoading] = useState(false)

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/maintenance/completions')
      if (res.ok) {
        const data = await res.json()
        setAllRecords(data.records || [])
      }
    } catch (err) {
      console.error('Failed to refresh completion registry:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchRecords()
    }
  }, [refreshTrigger])

  const displayedRecords = category
    ? allRecords.filter(r => r.machine?.category === category)
    : allRecords

  return (
    <div className="glass-panel" style={{ padding: '1.4rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.15rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.25rem 0', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📋 Maintenance Completion Registry</span>
            <span className="badge accent tabular-nums" style={{ fontSize: '0.72rem' }}>
              {displayedRecords.length} logged
            </span>
          </h2>
          <div style={{ fontSize: '0.84rem', color: '#94a3b8' }}>
            Historical log of completed scheduled services, parts consumed, and fitter assignments.
          </div>
        </div>

        <button
          type="button"
          onClick={fetchRecords}
          disabled={loading}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh registry'}
        </button>
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Maintenance Completion Registry"
        className="table-wrapper"
        style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}
      >
        <table className="hemmms-table" style={{ minWidth: '900px' }}>
          <thead>
            <tr>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>COMPLETED AT</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>{category === 'Shovel' ? 'SHOVEL' : 'DRILL'}</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>MODEL &amp; PARTS</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>LAST HMR</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>CURRENT HMR</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>INTERVAL</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>USED HRS</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>DUE HRS</th>
              <th scope="col" style={{ padding: '0.8rem 1rem' }}>FITTER NAME</th>
            </tr>
          </thead>
          <tbody>
            {displayedRecords.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No completed services recorded for {category === 'Shovel' ? 'shovels' : 'drills'} yet. Completed maintenance will automatically appear here.
                </td>
              </tr>
            ) : (
              displayedRecords.map(record => {
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
                const lastHmr = primarySchedule?.lastMaintenanceHmr || currentHmr
                const usedHrs = Math.max(0, currentHmr - lastHmr)
                const dueHrs = interval - usedHrs
                const fitter = record.performedBy || 'Fitter'

                return (
                  <tr key={record.id}>
                    <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {formattedDate}
                    </td>

                    <th scope="row" style={{ padding: '0.85rem 1rem', textAlign: 'left' }}>
                      <Link
                        href={`/machines/${record.machine.id}`}
                        style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}
                      >
                        {record.machine.name}
                      </Link>
                    </th>

                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ color: '#e2e8f0', fontWeight: 500 }}>{record.machine.model}</div>
                      {record.partsUsed && (
                        <div style={{ fontSize: '0.73rem', color: '#94a3b8', marginTop: '0.15rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={record.partsUsed}>
                          🔧 {record.partsUsed}
                        </div>
                      )}
                    </td>

                    <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                      {lastHmr.toFixed(0)}
                    </td>

                    <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                      {currentHmr.toFixed(1)}
                    </td>

                    <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>
                      {interval}h
                    </td>

                    <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>
                      {usedHrs.toFixed(2)}
                    </td>

                    <td className="tabular-nums" style={{ padding: '0.85rem 1rem', color: '#34d399', fontWeight: 600 }}>
                      {dueHrs.toFixed(2)}
                    </td>

                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        padding: '0.24rem 0.65rem 0.24rem 0.3rem',
                        borderRadius: '999px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.28)'
                      }}>
                        <span style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: '#38bdf8',
                          color: '#060a14',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          display: 'grid',
                          placeItems: 'center'
                        }}>
                          {getInitials(fitter)}
                        </span>
                        <span style={{ color: '#e2e8f0', fontSize: '0.8rem', fontWeight: 600 }}>
                          {fitter}
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
  )
}
