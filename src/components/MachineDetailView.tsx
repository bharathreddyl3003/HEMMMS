"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EditMachineModal from '@/components/EditMachineModal'
import EditSubassemblyModal from '@/components/EditSubassemblyModal'
import AddSubassemblyModal from '@/components/AddSubassemblyModal'
import ScheduledMaintenanceTab from '@/components/ScheduledMaintenanceTab'
import DailyLogsList from '@/components/DailyLogsList'
import EquipmentIcon from '@/components/EquipmentIcon'
import { extractCustomSpecs } from '@/lib/machine-details'

interface MachineSwitchOption {
  id: string
  name: string
  category: string
  model: string
}

interface SubassemblyItem {
  id: string
  name: string
  currentHours: number
  lifeExpectancyHours: number
  healthStatus: string
}

interface MachineDetailRecord {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  type: string
  status: string
  runningHours: number
  serialNumber?: string | null
  commissioningDate?: string | Date | null
  assetCode?: string | null
  manufactureYear?: number | null
  deploymentLocation?: string | null
  supervisorName?: string | null
  powerSource?: string | null
  engineDetails?: string | null
  operatingWeight?: string | null
  fluidCapacities?: string | null
  notes?: string | null
  customSpecs?: unknown
  subassemblies: SubassemblyItem[]
  maintenanceLogs: React.ComponentProps<typeof DailyLogsList>['initialLogs']
  scheduledMaintenances?: Array<{
    id: string
    type: string
    intervalHrs: number
    lastMaintenanceDate: string | Date
    lastMaintenanceHmr: number
  }>
}

interface MachineDetailViewProps {
  machine: MachineDetailRecord
  canEdit: boolean
  canManageScheduledMaintenance: boolean
  initialTab?: string
  initialFrom?: string
  initialModule?: string
  fleetMachines?: MachineSwitchOption[]
}

export default function MachineDetailView({
  machine,
  canEdit,
  canManageScheduledMaintenance,
  initialTab = 'overview',
  initialFrom,
  initialModule,
  fleetMachines = [],
}: MachineDetailViewProps) {
  const router = useRouter()
  const [currentTab, setCurrentTab] = useState<'overview' | 'scheduled'>(
    initialTab === 'scheduled' ? 'scheduled' : 'overview'
  )

  const machineModule =
    initialModule === 'drills' || (machine.category !== 'Shovel' && initialModule !== 'shovels')
      ? 'drills'
      : 'shovels'

  const backTarget =
    initialFrom === 'maintenance'
      ? { href: '/?tab=maintenance', label: 'Back to Maintenance' }
      : initialFrom === 'hmr'
      ? { href: `/?tab=hmr&module=${machineModule}`, label: 'Back to HMR Register' }
      : { href: `/?module=${machineModule}`, label: 'Back to Dashboard' }

  const handleTabSwitch = (tab: 'overview' | 'scheduled') => {
    setCurrentTab(tab)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', tab)
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleUnitJump = (targetId: string) => {
    if (!targetId || targetId === machine.id) return
    const query = new URLSearchParams()
    if (currentTab === 'scheduled') query.set('tab', 'scheduled')
    if (initialFrom) query.set('from', initialFrom)
    const qs = query.toString()
    router.push(`/machines/${targetId}${qs ? `?${qs}` : ''}`)
  }

  const canEditScheduled = canEdit || canManageScheduledMaintenance
  const customSpecs = extractCustomSpecs(machine.customSpecs)

  const specRows: Array<{ label: string; value: string }> = [
    ...(machine.assetCode ? [{ label: 'Asset Code', value: machine.assetCode }] : []),
    ...(machine.manufactureYear ? [{ label: 'Manufacture Year', value: String(machine.manufactureYear) }] : []),
    ...(machine.deploymentLocation ? [{ label: 'Deployment Bench / Location', value: machine.deploymentLocation }] : []),
    ...(machine.supervisorName ? [{ label: 'Section In-charge', value: machine.supervisorName }] : []),
    ...(machine.powerSource ? [{ label: 'Power Source / Drive', value: machine.powerSource }] : []),
    ...(machine.engineDetails ? [{ label: 'Engine / Motor Rating', value: machine.engineDetails }] : []),
    ...(machine.operatingWeight ? [{ label: 'Operating Weight', value: machine.operatingWeight }] : []),
    ...(machine.fluidCapacities ? [{ label: 'Fuel & Hydraulic Capacities', value: machine.fluidCapacities }] : []),
    ...customSpecs,
  ]

  return (
    <main style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '1240px', marginInline: 'auto' }}>
      {/* Context-Aware Breadcrumb & Quick Unit Switcher */}
      <div className="mb-4 flex-between" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.86rem' }}>
          <Link href={backTarget.href} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
            &larr; {backTarget.label}
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <Link
            href={`/?module=${machineModule}`}
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
          >
            {machineModule === 'shovels' ? 'Shovels Module' : 'Drills Module'}
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: '#f8fafc', fontWeight: 600 }}>{machine.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {fleetMachines.length > 1 && (
            <select
              aria-label="Switch Equipment Unit"
              value={machine.id}
              onChange={(e) => handleUnitJump(e.target.value)}
              style={{
                margin: 0,
                width: 'auto',
                minWidth: '185px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.84rem',
                background: 'rgba(15, 23, 42, 0.8)',
              }}
            >
              {fleetMachines.map((fm) => (
                <option key={fm.id} value={fm.id}>
                  {fm.name} ({fm.model})
                </option>
              ))}
            </select>
          )}
          {canEdit && <EditMachineModal machine={machine} />}
        </div>
      </div>

      {/* Telemetry Header Card */}
      <div className="glass-panel mb-5">
        <div className="flex-between responsive-hero" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <EquipmentIcon category={machine.category} size={30} />
              <h1 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.45rem)', margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {machine.name}
              </h1>
              {machine.capacity && (
                <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.35)', fontSize: '0.85rem', padding: '0.3rem 0.7rem' }}>
                  {machine.capacity}
                </span>
              )}
              {machine.assetCode && (
                <span className="badge tabular-nums" style={{ background: 'rgba(45, 212, 191, 0.14)', color: '#2dd4bf', borderColor: 'rgba(45, 212, 191, 0.32)', fontSize: '0.8rem', padding: '0.28rem 0.65rem' }}>
                  {machine.assetCode}
                </span>
              )}
              {machine.deploymentLocation && (
                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.25)', fontSize: '0.8rem', padding: '0.28rem 0.65rem' }}>
                  {machine.deploymentLocation}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.85rem', color: 'var(--text-secondary)', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <span><strong>Category:</strong> {machine.category || 'Drill'}</span>
              {machine.make && (
                <>
                  <span>&bull;</span>
                  <span><strong>Make:</strong> {machine.make}</span>
                </>
              )}
              <span>&bull;</span>
              <span><strong>Model:</strong> {machine.model}</span>
              <span>&bull;</span>
              <span><strong>Type:</strong> {machine.type}</span>
              {machine.serialNumber && (
                <>
                  <span>&bull;</span>
                  <span><strong>S/N:</strong> {machine.serialNumber}</span>
                </>
              )}
              {machine.commissioningDate && (
                <>
                  <span>&bull;</span>
                  <span><strong>Commissioned:</strong> {new Date(machine.commissioningDate).toLocaleDateString()}</span>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className={`badge ${machine.status === 'Working' ? 'success' : machine.status === 'Under Maintenance' ? 'warning' : 'danger'} mb-2`} style={{ fontSize: '0.95rem', padding: '0.45rem 0.9rem' }}>
              {machine.status}
            </div>
            <div className="tabular-nums font-heading" style={{ fontSize: '1.95rem', fontWeight: 700, color: '#f8fafc' }}>
              {Number(machine.runningHours || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
              <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', fontWeight: 500 }}>HMR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Glass Segmented Tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          role="tablist"
          aria-label="Machine Sections"
          style={{
            display: 'inline-flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            padding: '0.3rem',
            borderRadius: '12px',
            background: 'rgba(6, 10, 20, 0.65)',
            border: '1px solid var(--border)',
          }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'overview'}
            onClick={() => handleTabSwitch('overview')}
            style={{
              padding: '0.55rem 1.2rem',
              borderRadius: '9px',
              fontSize: '0.92rem',
              fontWeight: currentTab === 'overview' ? 700 : 500,
              background: currentTab === 'overview' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: currentTab === 'overview' ? '#f8fafc' : 'var(--text-secondary)',
              border: currentTab === 'overview' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Overview
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={currentTab === 'scheduled'}
            onClick={() => handleTabSwitch('scheduled')}
            style={{
              padding: '0.55rem 1.2rem',
              borderRadius: '9px',
              fontSize: '0.92rem',
              fontWeight: currentTab === 'scheduled' ? 700 : 500,
              background: currentTab === 'scheduled' ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: currentTab === 'scheduled' ? '#f8fafc' : 'var(--text-secondary)',
              border: currentTab === 'scheduled' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Scheduled Maintenance
          </button>
        </div>
      </div>

      {currentTab === 'overview' && (
        <>
          {(specRows.length > 0 || machine.notes || canEdit) && (
            <section className="glass-panel mb-5" aria-label="Equipment Specifications and Details">
              <div className="flex-between mb-3" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Equipment Specifications &amp; Assignment</h2>
                {specRows.length === 0 && !machine.notes && canEdit && (
                  <span className="text-sm">Use Edit Machine above to add engine rating, site bench, weight, and custom specs.</span>
                )}
              </div>

              {specRows.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '0.75rem',
                }}>
                  {specRows.map((row) => (
                    <div
                      key={`${row.label}-${row.value}`}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        background: 'rgba(6, 10, 20, 0.45)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>
                        {row.label}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', wordBreak: 'break-word' }}>
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {machine.notes && (
                <div style={{
                  marginTop: specRows.length > 0 ? '0.85rem' : 0,
                  padding: '0.75rem 0.9rem',
                  borderRadius: '10px',
                  background: 'rgba(56, 189, 248, 0.06)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#38bdf8', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Technical Notes &amp; Remarks
                  </div>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                    {machine.notes}
                  </p>
                </div>
              )}
            </section>
          )}

          <div className="responsive-grid">
          <div>
            <div className="flex-between mb-4">
              <h2>Subassemblies Health</h2>
              {canEdit && <AddSubassemblyModal machineId={machine.id} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
              {machine.subassemblies.map((sub) => {
                const healthPercent = sub.lifeExpectancyHours > 0
                  ? Math.min(100, Math.max(0, 100 - (sub.currentHours / sub.lifeExpectancyHours) * 100))
                  : 100
                return (
                  <div key={sub.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                    <div className="flex-between mb-3">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{sub.name}</h3>
                        {canEdit && <EditSubassemblyModal subassembly={sub} />}
                      </div>
                      <span className={`badge ${sub.healthStatus === 'Good' ? 'success' : sub.healthStatus === 'Warning' ? 'warning' : 'danger'}`}>
                        {sub.healthStatus}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                          <span>Life Remaining</span>
                          <strong className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{healthPercent.toFixed(1)}%</strong>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                          <div style={{
                            height: '100%',
                            width: `${healthPercent}%`,
                            background: healthPercent > 50 ? 'var(--success)' : healthPercent > 20 ? 'var(--warning)' : 'var(--danger)',
                            transition: 'width 1s ease-in-out',
                            boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                          }} />
                        </div>
                      </div>

                      <div className="tabular-nums" style={{ textAlign: 'right', minWidth: '100px' }}>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hours Used</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{sub.currentHours}</div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>of {sub.lifeExpectancyHours}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <DailyLogsList
              machineId={machine.id}
              initialLogs={machine.maintenanceLogs}
              currentHmr={machine.runningHours}
            />
          </div>
        </div>
        </>
      )}

      {currentTab === 'scheduled' && (
        <>
          {!canEditScheduled && (
            <div className="glass-panel mb-4" style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', borderInlineStart: '3px solid #38bdf8' }}>
              Read-only view: scheduled-maintenance completion is restricted to authorized engineers.
            </div>
          )}
          <ScheduledMaintenanceTab
            machineId={machine.id}
            currentMachineHmr={machine.runningHours}
            canEdit={canEditScheduled}
            initialSchedules={machine.scheduledMaintenances}
          />
        </>
      )}
    </main>
  )
}
