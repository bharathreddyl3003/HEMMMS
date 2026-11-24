"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import HmrRegisterTable, { MachineWithSchedule } from './HmrRegisterTable'
import MaintenanceCompletionRegistry, { CompletionRecord } from './MaintenanceCompletionRegistry'
import AddMachineModal from './AddMachineModal'

interface HmrRegisterViewProps {
  shovels: MachineWithSchedule[]
  drills: MachineWithSchedule[]
  initialCompletions: CompletionRecord[]
  activeModule: 'shovels' | 'drills'
  canEdit: boolean
}

export default function HmrRegisterView({
  shovels,
  drills,
  initialCompletions,
  activeModule: initialActiveModule,
  canEdit
}: HmrRegisterViewProps) {
  const [activeModule, setActiveModule] = useState<'shovels' | 'drills'>(initialActiveModule)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const activeMachines = activeModule === 'shovels' ? shovels : drills
  const activeCategory = activeModule === 'shovels' ? 'Shovel' : 'Drill'

  const handleCompletionAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.25rem', margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fleet Overview / HMR Register
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live machine-wise daily HMR tracking, service intervals & fitter completion registry
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/maintenance-status"
            className="btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', background: 'rgba(255, 255, 255, 0.05)' }}
          >
            Maintenance Control
          </Link>
          <Link
            href="/mobile-hmr"
            className="btn"
            style={{ 
              padding: '0.5rem 1.1rem', 
              fontSize: '0.875rem', 
              background: 'rgba(56, 189, 248, 0.15)', 
              color: '#38bdf8', 
              border: '1px solid rgba(56, 189, 248, 0.4)',
              fontWeight: 600
            }}
          >
            📱 Mobile HMR ↗
          </Link>
          {canEdit && (
            <AddMachineModal defaultCategory={activeModule === 'shovels' ? 'Shovel' : 'Drill'} />
          )}
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.75rem'
      }}>
        <button
          onClick={() => setActiveModule('shovels')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            fontSize: '1.05rem',
            cursor: 'pointer',
            fontWeight: activeModule === 'shovels' ? 700 : 500,
            background: activeModule === 'shovels' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeModule === 'shovels' ? '#38bdf8' : 'var(--text-secondary)',
            border: activeModule === 'shovels' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: activeModule === 'shovels' ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🚜</span>
          <span>Shovels Module</span>
          <span style={{ 
            background: activeModule === 'shovels' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
            color: activeModule === 'shovels' ? '#0f172a' : '#cbd5e1',
            borderRadius: '999px',
            padding: '0.15rem 0.55rem',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {shovels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveModule('drills')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            fontSize: '1.05rem',
            cursor: 'pointer',
            fontWeight: activeModule === 'drills' ? 700 : 500,
            background: activeModule === 'drills' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeModule === 'drills' ? '#38bdf8' : 'var(--text-secondary)',
            border: activeModule === 'drills' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: activeModule === 'drills' ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🛠️</span>
          <span>Drills Module</span>
          <span style={{ 
            background: activeModule === 'drills' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
            color: activeModule === 'drills' ? '#0f172a' : '#cbd5e1',
            borderRadius: '999px',
            padding: '0.15rem 0.55rem',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {drills.length}
          </span>
        </button>
      </div>

      {/* Page 1: HMR Register with Auto-save & KPI Cards */}
      <HmrRegisterTable
        machines={activeMachines}
        activeModule={activeModule}
        canEdit={canEdit}
        onCompletionAdded={handleCompletionAdded}
      />

      {/* Page 2: Maintenance Completion Registry */}
      <MaintenanceCompletionRegistry
        initialRecords={initialCompletions}
        category={activeCategory}
        refreshTrigger={refreshTrigger}
      />
    </div>
  )
}
