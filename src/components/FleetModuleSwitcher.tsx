"use client"

import React from 'react'
import EquipmentIcon from './EquipmentIcon'

export type FleetModuleFilter = 'all' | 'shovels' | 'drills'

interface BaseProps {
  shovelsCount: number
  drillsCount: number
  totalCount?: number
  ariaLabel?: string
}

type FleetModuleSwitcherProps =
  | (BaseProps & {
      includeAll: true
      value: FleetModuleFilter
      onChange: (mod: FleetModuleFilter) => void
    })
  | (BaseProps & {
      includeAll?: false
      value: 'shovels' | 'drills'
      onChange: (mod: 'shovels' | 'drills') => void
    })

/**
 * Unified Shovels Module / Drills Module (and optional All Fleet) segmented tab switcher
 * shared across Equipment Fleet, HMR Register, Maintenance, and Field HMR views.
 */
export default function FleetModuleSwitcher(props: FleetModuleSwitcherProps) {
  const {
    shovelsCount,
    drillsCount,
    totalCount = shovelsCount + drillsCount,
    ariaLabel = 'Fleet Category',
  } = props

  const tabs: Array<{ key: FleetModuleFilter; category?: 'Shovel' | 'Drill'; label: string; count: number }> = [
    ...(props.includeAll
      ? [{ key: 'all' as const, label: 'All Fleet', count: totalCount }]
      : []),
    { key: 'shovels', category: 'Shovel', label: 'Shovels Module', count: shovelsCount },
    { key: 'drills', category: 'Drill', label: 'Drills Module', count: drillsCount },
  ]

  const handleSelect = (key: FleetModuleFilter) => {
    if (props.includeAll) {
      props.onChange(key)
    } else if (key === 'shovels' || key === 'drills') {
      props.onChange(key)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
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
      {tabs.map((tab) => {
        const isActive = props.value === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(tab.key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '9px',
              fontSize: '0.92rem',
              fontWeight: isActive ? 700 : 500,
              background: isActive ? 'rgba(56, 189, 248, 0.16)' : 'transparent',
              color: isActive ? '#f8fafc' : 'var(--text-secondary)',
              border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.category && <EquipmentIcon category={tab.category} size={16} />}
            <span>{tab.label}</span>
            <span
              className="tabular-nums"
              style={{
                background: isActive ? '#38bdf8' : 'rgba(255,255,255,0.1)',
                color: isActive ? '#060a14' : '#cbd5e1',
                borderRadius: '999px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}
            >
              {tab.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}
