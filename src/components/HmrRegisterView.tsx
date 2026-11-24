"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import HmrRegisterTable, { MachineWithSchedule } from './HmrRegisterTable'
import MaintenanceCompletionRegistry, { CompletionRecord } from './MaintenanceCompletionRegistry'
import AddMachineModal from './AddMachineModal'
import type { SparePartOption } from './SparePartUsageSelector'

interface HmrRegisterViewProps {
  shovels: MachineWithSchedule[]
  drills: MachineWithSchedule[]
  initialCompletions: CompletionRecord[]
  spareParts?: SparePartOption[]
  activeModule: 'shovels' | 'drills'
  canEdit: boolean
}

export default function HmrRegisterView({
  shovels,
  drills,
  initialCompletions,
  spareParts = [],
  activeModule: initialActiveModule,
  canEdit
}: HmrRegisterViewProps) {
  const [activeModule, setActiveModule] = useState<'shovels' | 'drills'>(initialActiveModule)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const activeMachines = activeModule === 'shovels' ? shovels : drills
  const activeCategory = activeModule === 'shovels' ? 'Shovel' : 'Drill'

  const handleTabSwitch = (mod: 'shovels' | 'drills') => {
    setActiveModule(mod)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('module', mod)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleCompletionAdded = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.75rem 1.5rem 3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
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
            Daily Service &amp; Hour Meter Tracking
          </div>
          <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fleet Overview &amp; HMR Register
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live machine-wise daily HMR entry with auto-save, interval countdown, and fitter completion log
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/maintenance-status" className="btn btn-secondary">
            Maintenance Control
          </Link>
          <Link
            href={`/mobile-hmr?module=${activeModule}`}
            className="btn"
            style={{
              background: 'rgba(56, 189, 248, 0.14)',
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.35)',
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

      {/* Segmented Module Tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          role="tablist"
          aria-label="Equipment Register Category"
          style={{
            display: 'inline-flex',
            gap: '0.4rem',
            padding: '0.3rem',
            borderRadius: '12px',
            background: 'rgba(6, 10, 20, 0.65)',
            border: '1px solid var(--border)'
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeModule === 'shovels'}
            onClick={() => handleTabSwitch('shovels')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.55rem 1.2rem',
              borderRadius: '9px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: activeModule === 'shovels' ? 700 : 500,
              background: activeModule === 'shovels' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: activeModule === 'shovels' ? '#f8fafc' : 'var(--text-secondary)',
              border: activeModule === 'shovels' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
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
              padding: '0.55rem 1.2rem',
              borderRadius: '9px',
              fontSize: '0.95rem',
              cursor: 'pointer',
              fontWeight: activeModule === 'drills' ? 700 : 500,
              background: activeModule === 'drills' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: activeModule === 'drills' ? '#f8fafc' : 'var(--text-secondary)',
              border: activeModule === 'drills' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
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
      </div>

      {/* Page 1: HMR Register with Auto-save & KPI Cards */}
      <HmrRegisterTable
        machines={activeMachines}
        activeModule={activeModule}
        canEdit={canEdit}
        spareParts={spareParts}
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
