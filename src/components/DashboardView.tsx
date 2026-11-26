"use client"

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AddMachineModal from '@/components/AddMachineModal'
import EquipmentIcon from '@/components/EquipmentIcon'
import FleetModuleSwitcher from '@/components/FleetModuleSwitcher'
import HmrRegisterView from '@/components/HmrRegisterView'
import MaintenanceStatusView from '@/components/MaintenanceStatusView'
import MobileHmrView from '@/components/MobileHmrView'
import NavIcon, { type NavIconName } from '@/components/NavIcon'
import { buildMaintenanceStatuses, type ProcessedMachineStatus } from '@/lib/maintenance-status'
import type { MachineWithSchedule } from '@/components/HmrRegisterTable'
import type { CompletionRecord } from '@/components/MaintenanceCompletionRegistry'
import type { SparePartOption } from '@/components/SparePartUsageSelector'

export type DashboardTab = 'fleet' | 'hmr' | 'maintenance' | 'field'

interface MachineItem {
  id: string
  name: string
  model: string
  category: string
  make?: string | null
  capacity?: string | null
  serialNumber?: string | null
  type: string
  status: string
  runningHours: number
  subassemblies: Array<{
    id: string
    name: string
    currentHours: number
    lifeExpectancyHours: number
    healthStatus: string
  }>
  scheduledMaintenances?: MachineWithSchedule['scheduledMaintenances']
}

interface DashboardViewProps {
  allMachines: MachineItem[]
  initialModule: 'shovels' | 'drills'
  canEdit: boolean
  initialTab?: DashboardTab
  initialCompletions?: CompletionRecord[]
  spareParts?: SparePartOption[]
}

const DASHBOARD_TABS: Array<{ key: DashboardTab; label: string; icon: NavIconName }> = [
  { key: 'fleet', label: 'Equipment Fleet', icon: 'grid' },
  { key: 'hmr', label: 'HMR Register', icon: 'clock' },
  { key: 'maintenance', label: 'Maintenance', icon: 'wrench' },
  { key: 'field', label: 'Field HMR', icon: 'phone' },
]

export default function DashboardView({
  allMachines,
  initialModule,
  canEdit,
  initialTab = 'fleet',
  initialCompletions = [],
  spareParts = []
}: DashboardViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab)
  const [activeModule, setActiveModule] = useState<'shovels' | 'drills'>(initialModule)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'attention'>('all')
  const [sortBy, setSortBy] = useState<'urgency' | 'name' | 'hmr'>('urgency')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [hmrOverrides, setHmrOverrides] = useState<Record<string, number>>({})

  // Apply optimistic HMR updates immediately so switching Dashboard tabs stays synced
  const effectiveMachines = useMemo(
    () =>
      allMachines.map((m) =>
        hmrOverrides[m.id] !== undefined
          ? { ...m, runningHours: hmrOverrides[m.id] }
          : m
      ),
    [allMachines, hmrOverrides]
  )

  const shovels = useMemo(
    () => effectiveMachines.filter(m => m.category === 'Shovel'),
    [effectiveMachines]
  )
  const drills = useMemo(
    () => effectiveMachines.filter(m => m.category === 'Drill' || !m.category),
    [effectiveMachines]
  )
  const moduleMachines = activeModule === 'shovels' ? shovels : drills

  const shovelsWithSchedule = useMemo<MachineWithSchedule[]>(
    () => shovels.map(m => ({ ...m, scheduledMaintenances: m.scheduledMaintenances ?? [] })),
    [shovels]
  )
  const drillsWithSchedule = useMemo<MachineWithSchedule[]>(
    () => drills.map(m => ({ ...m, scheduledMaintenances: m.scheduledMaintenances ?? [] })),
    [drills]
  )

  const maintenanceStatuses = useMemo(
    () => buildMaintenanceStatuses(effectiveMachines),
    [effectiveMachines]
  )
  const statusByMachineId = useMemo(
    () => new Map(maintenanceStatuses.map(s => [s.id, s])),
    [maintenanceStatuses]
  )
  const overdueMaintenanceCount = useMemo(
    () => maintenanceStatuses.filter(m => m.minHoursLeft <= 0).length,
    [maintenanceStatuses]
  )
  const dueSoonMaintenanceCount = useMemo(
    () => maintenanceStatuses.filter(m => m.minHoursLeft > 0 && m.minHoursLeft <= 50).length,
    [maintenanceStatuses]
  )

  const syncUrlParams = (updates: Record<string, string>) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      Object.entries(updates).forEach(([key, value]) => url.searchParams.set(key, value))
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleDashboardTabSwitch = (tab: DashboardTab) => {
    setActiveTab(tab)
    syncUrlParams({ tab })
  }

  const handleModuleSwitch = (mod: 'shovels' | 'drills') => {
    setActiveModule(mod)
    syncUrlParams({ module: mod })
  }

  const handleMachineHmrUpdated = (machineId: string, runningHours: number) => {
    setHmrOverrides(prev => ({ ...prev, [machineId]: runningHours }))
  }

  const handleCompletionAdded = () => {
    router.refresh()
  }

  // Filtered and sorted machines (0ms client sort: Urgency, A-Z, or Highest HMR)
  const displayedMachines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const filtered = moduleMachines.filter(m => {
      const pmStatus = statusByMachineId.get(m.id)
      const hasSubWarning = m.subassemblies.some(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical')
      const hasPmAttention = pmStatus !== undefined && pmStatus.minHoursLeft <= 50
      const needsAttention = m.status !== 'Working' || hasSubWarning || hasPmAttention

      if (statusFilter === 'healthy' && needsAttention) return false
      if (statusFilter === 'attention' && !needsAttention) return false

      if (!q) return true
      return (
        m.name.toLowerCase().includes(q) ||
        m.model.toLowerCase().includes(q) ||
        (m.make && m.make.toLowerCase().includes(q)) ||
        (m.capacity && m.capacity.toLowerCase().includes(q))
      )
    })

    const getUrgencyRank = (m: MachineItem) => {
      if (m.status === 'Breakdown') return 0
      if (m.status === 'Under Maintenance') return 1
      const pm = statusByMachineId.get(m.id)
      const hasCritical = m.subassemblies.some(s => s.healthStatus === 'Critical')
      if ((pm && pm.minHoursLeft <= 0) || hasCritical) return 2
      const hasWarning = m.subassemblies.some(s => s.healthStatus === 'Warning')
      if ((pm && pm.minHoursLeft <= 50) || hasWarning) return 3
      return 4
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'hmr') return (b.runningHours || 0) - (a.runningHours || 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name)

      const rankDiff = getUrgencyRank(a) - getUrgencyRank(b)
      if (rankDiff !== 0) return rankDiff

      const aLeft = statusByMachineId.get(a.id)?.minHoursLeft ?? Infinity
      const bLeft = statusByMachineId.get(b.id)?.minHoursLeft ?? Infinity
      if (aLeft !== bLeft) return aLeft - bLeft

      return a.name.localeCompare(b.name)
    })
  }, [moduleMachines, searchQuery, statusFilter, sortBy, statusByMachineId])

  return (
    <main style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '1400px', marginInline: 'auto' }}>
      {/* Top Header */}
      <div className="flex-between mb-5" style={{ flexWrap: 'wrap', gap: '1rem' }}>
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
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            RGOCP2 Open-Cast Fleet Operations
          </div>
          <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fleet Command Center
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time machine health, daily HMR register, preventive maintenance, and field entry
          </p>
        </div>

        {canEdit && (
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <AddMachineModal
              defaultCategory={activeModule === 'shovels' ? 'Shovel' : 'Drill'}
              buttonLabel="+ Add Equipment"
            />
          </div>
        )}
      </div>

      {/* Elevated Dashboard Command Tabs */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          role="tablist"
          aria-label="Dashboard Sections"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 235px), 1fr))',
            gap: '0.85rem',
          }}
        >
          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.key

            const accentColor =
              tab.key === 'maintenance'
                ? overdueMaintenanceCount > 0
                  ? '#f43f5e'
                  : dueSoonMaintenanceCount > 0
                  ? '#f59e0b'
                  : '#10b981'
                : tab.key === 'hmr'
                ? '#2dd4bf'
                : '#38bdf8'

            const subtitle =
              tab.key === 'fleet'
                ? 'Unit Cards & Subassembly Health'
                : tab.key === 'hmr'
                ? 'Daily Auto-Save Log & History'
                : tab.key === 'maintenance'
                ? 'Preventive Urgency Matrix'
                : 'Rapid Mobile Touch Entry'

            const pillText =
              tab.key === 'fleet'
                ? `${effectiveMachines.length} Units`
                : tab.key === 'hmr'
                ? 'Daily Sheet'
                : tab.key === 'maintenance'
                ? overdueMaintenanceCount > 0
                  ? `${overdueMaintenanceCount} Overdue`
                  : dueSoonMaintenanceCount > 0
                  ? `${dueSoonMaintenanceCount} Due Soon`
                  : 'All Clear'
                : 'Quick Entry'

            const pillColors =
              tab.key === 'maintenance' && overdueMaintenanceCount > 0
                ? { bg: 'rgba(244, 63, 94, 0.18)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.42)' }
                : tab.key === 'maintenance' && dueSoonMaintenanceCount > 0
                ? { bg: 'rgba(245, 158, 11, 0.18)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.42)' }
                : tab.key === 'maintenance'
                ? { bg: 'rgba(16, 185, 129, 0.16)', text: '#34d399', border: 'rgba(16, 185, 129, 0.35)' }
                : isActive
                ? { bg: 'rgba(56, 189, 248, 0.2)', text: '#e0f2fe', border: 'rgba(56, 189, 248, 0.45)' }
                : { bg: 'rgba(255, 255, 255, 0.06)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.18)' }

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleDashboardTabSwitch(tab.key)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.65rem',
                  textAlign: 'left',
                  padding: '0.95rem 1.05rem',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  background: isActive
                    ? `linear-gradient(145deg, rgba(15, 23, 42, 0.92), rgba(14, 165, 233, 0.14))`
                    : 'rgba(15, 23, 42, 0.58)',
                  border: isActive
                    ? `1.5px solid ${accentColor}`
                    : '1px solid rgba(148, 163, 184, 0.18)',
                  boxShadow: isActive
                    ? `0 12px 28px -12px ${accentColor}88, inset 0 1px 0 rgba(255,255,255,0.12)`
                    : '0 6px 18px -10px rgba(0, 0, 0, 0.55)',
                  transition: 'all 0.18s ease',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: isActive ? '3px' : '2px',
                    background: isActive ? accentColor : 'rgba(148, 163, 184, 0.12)',
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '0.5rem' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      background: isActive ? `${accentColor}26` : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isActive ? `${accentColor}66` : 'rgba(148, 163, 184, 0.16)'}`,
                      color: isActive ? accentColor : '#cbd5e1',
                      flexShrink: 0,
                    }}
                  >
                    <NavIcon name={tab.icon} />
                  </div>

                  <span
                    className="tabular-nums"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.18rem 0.55rem',
                      borderRadius: '999px',
                      background: pillColors.bg,
                      color: pillColors.text,
                      border: `1px solid ${pillColors.border}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pillText}
                  </span>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    fontSize: '1.02rem',
                    fontWeight: 700,
                    color: isActive ? '#f8fafc' : '#e2e8f0',
                    marginBottom: '0.18rem',
                  }}>
                    <span>{tab.label}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: isActive ? '#cbd5e1' : 'var(--text-secondary)' }}>
                    {subtitle}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'fleet' && (
        <>
          {/* Segmented Module Switcher + Search/Filter Toolbar */}
          <div className="glass-panel mb-6" style={{ padding: '0.9rem 1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <FleetModuleSwitcher
                value={activeModule}
                shovelsCount={shovels.length}
                drillsCount={drills.length}
                onChange={handleModuleSwitch}
                ariaLabel="Fleet Category"
              />

              {/* Search & Status Filter */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
                <input
                  type="search"
                  aria-label="Filter equipment"
                  placeholder={`Search ${activeModule === 'shovels' ? 'T2, B1, EX1200...' : 'DM11, IDM30, REL650...'}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    margin: 0,
                    width: 'min(100%, 240px)',
                    padding: '0.48rem 0.85rem',
                    fontSize: '0.85rem'
                  }}
                />

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {(['all', 'healthy', 'attention'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setStatusFilter(f)}
                      style={{
                        padding: '0.45rem 0.8rem',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: statusFilter === f ? 600 : 500,
                        cursor: 'pointer',
                        background: statusFilter === f ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.04)',
                        color: statusFilter === f ? '#38bdf8' : 'var(--text-secondary)',
                        border: statusFilter === f ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border)'
                      }}
                    >
                      {f === 'all' ? 'All' : f === 'healthy' ? 'Healthy' : 'Attention'}
                    </button>
                  ))}
                </div>

                {/* Sort Order Toggle */}
                <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }} role="group" aria-label="Sort equipment">
                  {([
                    { key: 'urgency' as const, label: 'Urgency' },
                    { key: 'name' as const, label: 'A–Z' },
                    { key: 'hmr' as const, label: 'HMR' },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSortBy(opt.key)}
                      style={{
                        padding: '0.42rem 0.65rem',
                        fontSize: '0.78rem',
                        fontWeight: sortBy === opt.key ? 700 : 500,
                        cursor: 'pointer',
                        border: 'none',
                        background: sortBy === opt.key ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255,255,255,0.03)',
                        color: sortBy === opt.key ? '#38bdf8' : 'var(--text-secondary)',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Cards / Compact Table Toggle */}
                <div style={{ display: 'inline-flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }} role="group" aria-label="Fleet View Mode">
                  <button
                    type="button"
                    aria-pressed={viewMode === 'cards'}
                    onClick={() => setViewMode('cards')}
                    style={{
                      padding: '0.42rem 0.7rem',
                      fontSize: '0.78rem',
                      fontWeight: viewMode === 'cards' ? 700 : 500,
                      cursor: 'pointer',
                      border: 'none',
                      background: viewMode === 'cards' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255,255,255,0.03)',
                      color: viewMode === 'cards' ? '#38bdf8' : 'var(--text-secondary)',
                    }}
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    aria-pressed={viewMode === 'table'}
                    onClick={() => setViewMode('table')}
                    style={{
                      padding: '0.42rem 0.7rem',
                      fontSize: '0.78rem',
                      fontWeight: viewMode === 'table' ? 700 : 500,
                      cursor: 'pointer',
                      border: 'none',
                      background: viewMode === 'table' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255,255,255,0.03)',
                      color: viewMode === 'table' ? '#38bdf8' : 'var(--text-secondary)',
                    }}
                  >
                    List
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Equipment Cards Grid / Compact Fleet List */}
          {displayedMachines.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.4rem' }}>No matching equipment</div>
              <p className="text-sm" style={{ margin: 0 }}>Try clearing your search filter or switching fleet modules.</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="glass-panel" style={{ padding: '1.15rem' }}>
              <div tabIndex={0} role="region" aria-label="Compact Equipment List" className="table-wrapper" style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}>
                <table className="hemmms-table" style={{ minWidth: '820px' }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ padding: '0.85rem 1rem' }}>Equipment</th>
                      <th scope="col" style={{ padding: '0.85rem 1rem' }}>Status</th>
                      <th scope="col" style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Running HMR</th>
                      <th scope="col" style={{ padding: '0.85rem 1rem' }}>Next PM Due</th>
                      <th scope="col" style={{ padding: '0.85rem 1rem' }}>Component Health</th>
                      <th scope="col" style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedMachines.map((machine) => {
                      const pm = statusByMachineId.get(machine.id)
                      const flaggedSubs = machine.subassemblies.filter(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical')
                      const hasAttention = machine.status !== 'Working' || flaggedSubs.length > 0 || (pm !== undefined && pm.minHoursLeft <= 50)
                      const badgeClass = machine.status === 'Working' && !hasAttention ? 'success' : machine.status === 'Breakdown' || (pm && pm.minHoursLeft <= 0) ? 'danger' : 'warning'

                      return (
                        <tr key={machine.id}>
                          <th scope="row" style={{ padding: '0.85rem 1rem', textAlign: 'left', fontWeight: 600 }}>
                            <Link href={`/machines/${machine.id}?from=fleet&module=${activeModule}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <EquipmentIcon category={machine.category} size={17} />
                              <div>
                                <div style={{ color: '#38bdf8', fontWeight: 700, fontSize: '0.98rem' }}>{machine.name}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 400 }}>
                                  {machine.make ? `${machine.make} ` : ''}{machine.model}{machine.capacity ? ` • ${machine.capacity}` : ''}
                                </div>
                              </div>
                            </Link>
                          </th>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span className={`badge ${badgeClass}`}>{machine.status}</span>
                          </td>
                          <td className="tabular-nums" style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: '#f8fafc' }}>
                            {machine.runningHours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <PmCountdownChips status={pm} />
                          </td>
                          <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem' }}>
                            {flaggedSubs.length > 0 ? (
                              <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                {flaggedSubs.map(s => `${s.name} (${s.healthStatus})`).join(', ')}
                              </span>
                            ) : (
                              <span style={{ color: '#34d399' }}>
                                {machine.subassemblies.length > 0 ? `All ${machine.subassemblies.length} Nominal` : 'Nominal'}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <Link href={`/machines/${machine.id}?from=fleet&module=${activeModule}`} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', minBlockSize: '30px' }}>
                              Inspect &rarr;
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid-dashboard">
              {displayedMachines.map((machine) => {
                const pm = statusByMachineId.get(machine.id)
                const flaggedSubs = machine.subassemblies.filter(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical')
                const hasWarning = flaggedSubs.length > 0
                const hasUrgentPm = pm !== undefined && pm.minHoursLeft <= 50
                const badgeClass =
                  machine.status === 'Breakdown' || (pm && pm.minHoursLeft <= 0) || flaggedSubs.some(s => s.healthStatus === 'Critical')
                    ? 'danger'
                    : machine.status !== 'Working' || hasWarning || hasUrgentPm
                    ? 'warning'
                    : 'success'
                const topAccent = badgeClass === 'success' ? '#10b981' : badgeClass === 'warning' ? '#f59e0b' : '#f43f5e'

                return (
                  <Link
                    href={`/machines/${machine.id}?from=fleet&module=${activeModule}`}
                    key={machine.id}
                    style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}
                  >
                    <div
                      className="glass-card-interactive"
                      style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        borderTop: `2px solid ${topAccent}`
                      }}
                    >
                      <div>
                        {/* Card Header: Name on left, Status + prominent HMR on right */}
                        <div className="flex-between mb-2" style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <EquipmentIcon category={machine.category} size={20} />
                              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700 }}>{machine.name}</h2>
                            </div>
                            {/* Make / Model / Capacity */}
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {machine.make && <strong style={{ color: '#cbd5e1' }}>{machine.make}</strong>}
                              <span>{machine.model}</span>
                              {machine.capacity && (
                                <span style={{
                                  background: 'rgba(56, 189, 248, 0.12)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(56, 189, 248, 0.25)',
                                  borderRadius: '6px',
                                  padding: '0.08rem 0.42rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600
                                }}>
                                  {machine.capacity}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem', flexShrink: 0 }}>
                            <span className={`badge ${badgeClass}`}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} aria-hidden="true" />
                              {machine.status}
                            </span>
                            <strong className="tabular-nums" style={{ fontSize: '0.96rem', color: '#38bdf8' }}>
                              {machine.runningHours.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} hrs
                            </strong>
                          </div>
                        </div>

                        {/* Next Preventive Service Countdown Chips */}
                        <div style={{ marginTop: '0.95rem' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Next Scheduled Service
                          </div>
                          <PmCountdownChips status={pm} />
                        </div>

                        {/* Signal-Only Subassembly Health */}
                        <div style={{ marginTop: '0.9rem' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                            Component Health
                          </div>
                          {flaggedSubs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {flaggedSubs.slice(0, 3).map(sub => {
                                const pct = sub.lifeExpectancyHours > 0
                                  ? Math.min(100, Math.max(0, 100 - (sub.currentHours / sub.lifeExpectancyHours) * 100))
                                  : 100
                                const barColor = sub.healthStatus === 'Warning' ? '#f59e0b' : '#f43f5e'
                                return (
                                  <div key={sub.id}>
                                    <div className="flex-between" style={{ fontSize: '0.78rem', marginBottom: '0.18rem' }}>
                                      <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '72%' }}>
                                        {sub.name}
                                      </span>
                                      <span style={{ color: barColor, fontWeight: 600, fontSize: '0.72rem' }}>
                                        {sub.healthStatus}
                                      </span>
                                    </div>
                                    <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '999px' }} />
                                    </div>
                                  </div>
                                )
                              })}
                              {flaggedSubs.length > 3 && (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem' }}>
                                  + {flaggedSubs.length - 3} more alert{flaggedSubs.length - 3 > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#34d399',
                              background: 'rgba(16, 185, 129, 0.08)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              borderRadius: '8px',
                              padding: '0.32rem 0.65rem',
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} aria-hidden="true" />
                              {machine.subassemblies.length > 0
                                ? `All ${machine.subassemblies.length} components Nominal`
                                : 'All components Nominal'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {machine.type}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
                          Inspect &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'hmr' && (
        <HmrRegisterView
          shovels={shovelsWithSchedule}
          drills={drillsWithSchedule}
          initialCompletions={initialCompletions}
          spareParts={spareParts}
          activeModule={activeModule}
          embedded
          onModuleChange={handleModuleSwitch}
          onHmrUpdated={handleMachineHmrUpdated}
          onCompletionAdded={handleCompletionAdded}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'maintenance' && (
        <MaintenanceStatusView
          initialMachines={maintenanceStatuses}
          totalMachinesCount={effectiveMachines.length}
          initialFilter="all"
          embedded
        />
      )}

      {activeTab === 'field' && (
        <MobileHmrView
          shovels={shovelsWithSchedule}
          drills={drillsWithSchedule}
          activeModule={activeModule}
          embedded
          onModuleChange={handleModuleSwitch}
          onHmrUpdated={handleMachineHmrUpdated}
          canEdit={canEdit}
        />
      )}
    </main>
  )
}

function PmCountdownChips({ status }: { status?: ProcessedMachineStatus }) {
  if (!status) {
    return <span style={{ fontSize: '0.76rem', color: '#64748b' }}>No PM schedule set</span>
  }

  const chips = [
    { label: 'Eng', hoursLeft: status.engineLeft, state: status.engineStatus },
    ...(!status.isShovel ? [{ label: 'Comp', hoursLeft: status.compressorLeft, state: status.compressorStatus }] : []),
    { label: 'Hyd', hoursLeft: status.hydraulicLeft, state: status.hydraulicStatus },
  ].filter((c): c is { label: string; hoursLeft: number; state: string } => c.hoursLeft !== null)

  if (chips.length === 0) {
    return <span style={{ fontSize: '0.76rem', color: '#64748b' }}>No PM schedule set</span>
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
      {chips.map((c) => {
        const isOverdue = c.hoursLeft <= 0
        const colors =
          c.state === 'danger'
            ? { bg: 'rgba(244, 63, 94, 0.14)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.32)' }
            : c.state === 'warning'
            ? { bg: 'rgba(245, 158, 11, 0.14)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.32)' }
            : { bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399', border: 'rgba(16, 185, 129, 0.24)' }

        return (
          <span
            key={c.label}
            className="tabular-nums"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.28rem',
              padding: '0.16rem 0.48rem',
              borderRadius: '7px',
              fontSize: '0.73rem',
              fontWeight: 600,
              background: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ opacity: 0.85 }}>{c.label}:</span>
            <span>{isOverdue ? `${c.hoursLeft.toFixed(0)}h` : `+${c.hoursLeft.toFixed(0)}h`}</span>
          </span>
        )
      })}
    </div>
  )
}
