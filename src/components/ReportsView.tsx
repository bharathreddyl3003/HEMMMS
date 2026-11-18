'use client'

import { useState, useMemo } from 'react'

interface Machine {
  id: string
  name: string
  model: string
  runningHours: number
  status: string
}

interface MaintenanceRecord {
  id: string
  machineId: string
  description: string
  logType: string
  hmr: number | null
  status: string
  performedBy: string | null
  partsUsed: string | null
  timeSpentHrs: number | null
  cost: number | null
  subassemblyName: string | null
  createdAt: string | Date
  machine: Machine
}

interface ReportsViewProps {
  initialRecords: MaintenanceRecord[]
  machines: Machine[]
}

export default function ReportsView({ initialRecords, machines }: ReportsViewProps) {
  const [selectedMachineId, setSelectedMachineId] = useState('ALL')
  const [selectedPeriod, setSelectedPeriod] = useState('ALL')

  // Filter records based on selected machine and time period
  const filteredRecords = useMemo(() => {
    return initialRecords.filter(r => {
      // Machine filter
      if (selectedMachineId !== 'ALL' && r.machineId !== selectedMachineId) {
        return false
      }

      // Period filter
      if (selectedPeriod !== 'ALL') {
        const recordDate = new Date(r.createdAt).getTime()
        const now = Date.now()
        const daysAgo = (now - recordDate) / (1000 * 60 * 60 * 24)

        if (selectedPeriod === '7D' && daysAgo > 7) return false
        if (selectedPeriod === '30D' && daysAgo > 30) return false
        if (selectedPeriod === '90D' && daysAgo > 90) return false
      }

      return true
    })
  }, [initialRecords, selectedMachineId, selectedPeriod])

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalCost = 0
    let totalLaborHours = 0
    let scheduledCount = 0
    let routineCount = 0
    let repairCount = 0
    let incidentCount = 0

    filteredRecords.forEach(r => {
      if (r.cost) totalCost += r.cost
      if (r.timeSpentHrs) totalLaborHours += r.timeSpentHrs

      if (r.logType === 'Scheduled Maintenance') scheduledCount++
      else if (r.logType === 'Routine') routineCount++
      else if (r.logType === 'Repair') repairCount++
      else if (r.logType === 'Incident') incidentCount++
    })

    const totalEvents = filteredRecords.length
    const proactiveEvents = scheduledCount + routineCount
    const proactiveRatio = totalEvents > 0 ? (proactiveEvents / totalEvents) * 100 : 100

    return {
      totalCost,
      totalLaborHours,
      totalEvents,
      scheduledCount,
      routineCount,
      repairCount,
      incidentCount,
      proactiveRatio
    }
  }, [filteredRecords])

  // Machine-wise table aggregation
  const machineAggregates = useMemo(() => {
    return machines.map(m => {
      const recordsForMachine = filteredRecords.filter(r => r.machineId === m.id)
      const cost = recordsForMachine.reduce((sum, r) => sum + (r.cost || 0), 0)
      const hours = recordsForMachine.reduce((sum, r) => sum + (r.timeSpentHrs || 0), 0)
      const breakdowns = recordsForMachine.filter(r => r.logType === 'Repair' || r.logType === 'Incident').length

      return {
        ...m,
        recordCount: recordsForMachine.length,
        cost,
        hours,
        breakdowns
      }
    }).sort((a, b) => b.cost - a.cost)
  }, [machines, filteredRecords])

  return (
    <div>
      {/* Filters & Actions Bar */}
      <div className="glass-panel mb-6" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Filter Unit
              </label>
              <select 
                value={selectedMachineId} 
                onChange={(e) => setSelectedMachineId(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
              >
                <option value="ALL">All Fleet Machines ({machines.length})</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.model})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                Timeframe
              </label>
              <select 
                value={selectedPeriod} 
                onChange={(e) => setSelectedPeriod(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', fontSize: '0.88rem' }}
              >
                <option value="ALL">All Time</option>
                <option value="7D">Last 7 Days</option>
                <option value="30D">Last 30 Days</option>
                <option value="90D">Last 90 Days</option>
              </select>
            </div>
          </div>

          <a 
            href="/api/reports/export"
            download
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', textDecoration: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export All to CSV
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #38bdf8' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Service Events
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#e2e8f0', margin: '0.4rem 0' }}>
            {metrics.totalEvents}
          </div>
          <div className="text-sm" style={{ color: '#38bdf8' }}>
            {metrics.scheduledCount} Scheduled &bull; {metrics.routineCount} Routine
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #34d399' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Maintenance Cost
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#34d399', margin: '0.4rem 0' }}>
            ${metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Parts & Labor expenditure
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #facc15' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Labor / Downtime
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#facc15', margin: '0.4rem 0' }}>
            {metrics.totalLaborHours.toFixed(1)} <span style={{ fontSize: '1.1rem', fontWeight: 400 }}>hrs</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Cumulative service hours
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #a855f7' }}>
          <div className="text-sm" style={{ color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Proactive Service Ratio
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#c084fc', margin: '0.4rem 0' }}>
            {metrics.proactiveRatio.toFixed(0)}%
          </div>
          <div className="text-sm" style={{ color: metrics.proactiveRatio >= 75 ? '#34d399' : '#fbbf24' }}>
            {metrics.proactiveRatio >= 75 ? 'Healthy Proactive Fleet' : 'High Breakdown Ratio'}
          </div>
        </div>
      </div>

      {/* Breakdown by Service Type */}
      <div className="glass-panel mb-6" style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Maintenance Type Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-between text-sm mb-1">
              <span>Scheduled Maintenance</span>
              <strong style={{ color: 'var(--accent)' }}>{metrics.scheduledCount}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.totalEvents > 0 ? (metrics.scheduledCount / metrics.totalEvents) * 100 : 0}%`, height: '100%', background: 'var(--accent)' }} />
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-between text-sm mb-1">
              <span>Routine Service</span>
              <strong style={{ color: 'var(--success)' }}>{metrics.routineCount}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.totalEvents > 0 ? (metrics.routineCount / metrics.totalEvents) * 100 : 0}%`, height: '100%', background: 'var(--success)' }} />
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-between text-sm mb-1">
              <span>Unscheduled Repairs</span>
              <strong style={{ color: 'var(--warning)' }}>{metrics.repairCount}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.totalEvents > 0 ? (metrics.repairCount / metrics.totalEvents) * 100 : 0}%`, height: '100%', background: 'var(--warning)' }} />
            </div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex-between text-sm mb-1">
              <span>Breakdowns / Incidents</span>
              <strong style={{ color: 'var(--danger)' }}>{metrics.incidentCount}</strong>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.totalEvents > 0 ? (metrics.incidentCount / metrics.totalEvents) * 100 : 0}%`, height: '100%', background: 'var(--danger)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Machine Breakdown Table */}
      <div className="glass-panel" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Machine Fleet Cost & Downtime Breakdown</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Machine</th>
              <th style={{ padding: '0.85rem 1rem' }}>Model</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Total HMR</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Logs Recorded</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Downtime (Hours)</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Breakdown Incidents</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Total Expenditure</th>
            </tr>
          </thead>
          <tbody>
            {machineAggregates.map((m, idx) => (
              <tr 
                key={m.id}
                style={{ 
                  borderBottom: idx === machineAggregates.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent)' }}>
                  {m.name}
                </td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  {m.model}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {m.runningHours.toFixed(1)} hrs
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {m.recordCount}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: m.hours > 0 ? '#facc15' : 'var(--text-secondary)' }}>
                  {m.hours.toFixed(1)} hrs
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: m.breakdowns > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                  {m.breakdowns}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: '#34d399' }}>
                  ${m.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
