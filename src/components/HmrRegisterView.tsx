"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import HmrRegisterTable, { MachineWithSchedule } from './HmrRegisterTable'
import MaintenanceCompletionRegistry, { CompletionRecord } from './MaintenanceCompletionRegistry'
import AddMachineModal from './AddMachineModal'
import FleetModuleSwitcher from './FleetModuleSwitcher'
import type { SparePartOption } from './SparePartUsageSelector'

interface HmrRegisterViewProps {
  shovels: MachineWithSchedule[]
  drills: MachineWithSchedule[]
  initialCompletions: CompletionRecord[]
  spareParts?: SparePartOption[]
  activeModule: 'shovels' | 'drills'
  canEdit: boolean
  embedded?: boolean
  onModuleChange?: (mod: 'shovels' | 'drills') => void
  onHmrUpdated?: (machineId: string, runningHours: number) => void
  onCompletionAdded?: () => void
}

export default function HmrRegisterView({
  shovels,
  drills,
  initialCompletions,
  spareParts = [],
  activeModule: initialActiveModule,
  canEdit,
  embedded = false,
  onModuleChange,
  onHmrUpdated,
  onCompletionAdded
}: HmrRegisterViewProps) {
  const [internalActiveModule, setInternalActiveModule] = useState<'shovels' | 'drills'>(initialActiveModule)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const activeModule = onModuleChange ? initialActiveModule : internalActiveModule
  const activeMachines = activeModule === 'shovels' ? shovels : drills
  const activeCategory = activeModule === 'shovels' ? 'Shovel' : 'Drill'

  const handleTabSwitch = (mod: 'shovels' | 'drills') => {
    setInternalActiveModule(mod)
    onModuleChange?.(mod)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('module', mod)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleCompletionAdded = () => {
    setRefreshTrigger(prev => prev + 1)
    onCompletionAdded?.()
  }

  return (
    <div style={embedded ? undefined : { maxWidth: '1400px', margin: '0 auto', padding: '1.75rem 1.5rem 3rem' }}>
      {!embedded && (
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
      )}

      {/* Segmented Module Tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <FleetModuleSwitcher
          value={activeModule}
          shovelsCount={shovels.length}
          drillsCount={drills.length}
          onChange={handleTabSwitch}
          ariaLabel="Equipment Register Category"
        />
      </div>

      {/* Page 1: HMR Register with Auto-save & KPI Cards */}
      <HmrRegisterTable
        machines={activeMachines}
        activeModule={activeModule}
        canEdit={canEdit}
        spareParts={spareParts}
        onCompletionAdded={handleCompletionAdded}
        onHmrUpdated={onHmrUpdated}
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
