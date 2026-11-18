'use client'

import { useState, useMemo } from 'react'
import AddLogModal from './AddLogModal'

interface MaintenanceRecord {
  id: string
  description: string
  logType: string
  hmr: number | null
  dueDate: Date | string | null
  status: string
  performedBy: string | null
  partsUsed: string | null
  timeSpentHrs: number | null
  cost: number | null
  subassemblyName: string | null
  createdAt: Date | string
}

interface DailyLogsListProps {
  machineId: string
  initialLogs: MaintenanceRecord[]
  currentHmr: number
}

export default function DailyLogsList({ machineId, initialLogs, currentHmr }: DailyLogsListProps) {
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesType = filterType === 'ALL' || log.logType === filterType
      const query = searchQuery.toLowerCase().trim()
      const matchesQuery = !query || 
        log.description.toLowerCase().includes(query) ||
        (log.performedBy && log.performedBy.toLowerCase().includes(query)) ||
        (log.partsUsed && log.partsUsed.toLowerCase().includes(query)) ||
        (log.subassemblyName && log.subassemblyName.toLowerCase().includes(query))
      return matchesType && matchesQuery
    })
  }, [initialLogs, filterType, searchQuery])

  return (
    <div>
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2>Daily Logs & History</h2>
        <AddLogModal machineId={machineId} currentHmr={currentHmr} />
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel mb-3" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) 2fr', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="ALL">All Types ({initialLogs.length})</option>
              <option value="Scheduled Maintenance">Scheduled Maintenance</option>
              <option value="Routine">Routine Service</option>
              <option value="Repair">Unscheduled Repair</option>
              <option value="Incident">Breakdown / Incident</option>
            </select>
          </div>
          <div>
            <input 
              type="text"
              placeholder="Search technician, parts, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem', maxHeight: '550px', overflowY: 'auto' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0, fontSize: '1rem' }}>No maintenance logs match your filter.</p>
            {searchQuery && (
              <button 
                className="btn btn-secondary mt-2" 
                onClick={() => { setSearchQuery(''); setFilterType('ALL'); }}
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Timeline vertical line */}
            <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)' }}></div>
            
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.25rem', margin: 0, padding: 0 }}>
              {filteredLogs.map(log => (
                <li key={log.id} style={{ position: 'relative', paddingLeft: '40px' }}>
                  {/* Timeline dot */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '11px', 
                    top: '8px', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    background: log.logType === 'Scheduled Maintenance' ? 'var(--accent)' : log.logType === 'Repair' ? 'var(--danger)' : log.logType === 'Incident' ? '#f43f5e' : 'var(--success)',
                    boxShadow: '0 0 0 4px var(--surface)'
                  }}></div>
                  
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem' }}>
                    <div className="flex-between mb-2" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className={`badge ${log.logType === 'Scheduled Maintenance' ? 'primary' : log.logType === 'Repair' ? 'danger' : log.logType === 'Incident' ? 'danger' : 'success'}`}>
                          {log.logType}
                        </span>
                        {log.subassemblyName && (
                          <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                            {log.subassemblyName}
                          </span>
                        )}
                      </div>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(log.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: 500, fontSize: '0.95rem', lineHeight: '1.4' }}>
                      {log.description}
                    </p>

                    {/* Metadata tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {log.hmr !== null && log.hmr !== undefined && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>HMR:</span>{' '}
                          <strong style={{ color: '#38bdf8' }}>{log.hmr.toFixed(1)} hrs</strong>
                        </div>
                      )}
                      
                      {log.performedBy && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>By:</span>{' '}
                          <strong style={{ color: '#e2e8f0' }}>{log.performedBy}</strong>
                        </div>
                      )}

                      {log.timeSpentHrs !== null && log.timeSpentHrs !== undefined && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Labor:</span>{' '}
                          <strong style={{ color: '#facc15' }}>{log.timeSpentHrs} hrs</strong>
                        </div>
                      )}

                      {log.cost !== null && log.cost !== undefined && (
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Cost:</span>{' '}
                          <strong style={{ color: '#4ade80' }}>${log.cost.toLocaleString()}</strong>
                        </div>
                      )}
                    </div>

                    {log.partsUsed && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: '#94a3b8', background: 'rgba(255,255,255,0.02)', padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
                        <strong>Parts Used:</strong> {log.partsUsed}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
