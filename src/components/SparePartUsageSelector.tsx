"use client"

import React, { useState, useEffect } from 'react'

export interface SparePartOption {
  id: string
  name: string
  partNumber: string
  stockQuantity: number
  reorderLevel: number
}

export interface SelectedSpareUsage {
  sparePartId: string
  quantity: number
}

interface SparePartUsageSelectorProps {
  initialSpares?: SparePartOption[]
  selectedParts: SelectedSpareUsage[]
  onChange: (parts: SelectedSpareUsage[]) => void
  manualNotes?: string
  onManualNotesChange?: (notes: string) => void
}

export default function SparePartUsageSelector({
  initialSpares,
  selectedParts,
  onChange,
  manualNotes = '',
  onManualNotesChange
}: SparePartUsageSelectorProps) {
  const hasInitialSpares = Boolean(initialSpares && initialSpares.length > 0)
  const [fetchedSpares, setFetchedSpares] = useState<SparePartOption[]>([])
  const [loading, setLoading] = useState(!hasInitialSpares)
  const [pickingPartId, setPickingPartId] = useState('')
  const [pickingQty, setPickingQty] = useState(1)

  const spares = hasInitialSpares ? (initialSpares as SparePartOption[]) : fetchedSpares

  useEffect(() => {
    if (hasInitialSpares) return
    let active = true
    fetch('/api/spares')
      .then(res => res.json())
      .then(data => {
        if (active && Array.isArray(data)) {
          setFetchedSpares(data)
        }
      })
      .catch(err => console.error('Failed to load spares:', err))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [hasInitialSpares])

  const handleAddPart = () => {
    if (!pickingPartId || pickingQty <= 0) return
    const spare = spares.find(s => s.id === pickingPartId)
    if (!spare) return

    const existing = selectedParts.find(p => p.sparePartId === pickingPartId)
    const newQty = (existing?.quantity || 0) + pickingQty

    if (newQty > spare.stockQuantity) {
      return
    }

    if (existing) {
      onChange(
        selectedParts.map(p =>
          p.sparePartId === pickingPartId ? { ...p, quantity: newQty } : p
        )
      )
    } else {
      onChange([...selectedParts, { sparePartId: pickingPartId, quantity: pickingQty }])
    }

    setPickingPartId('')
    setPickingQty(1)
  }

  const handleRemovePart = (sparePartId: string) => {
    onChange(selectedParts.filter(p => p.sparePartId !== sparePartId))
  }

  const handleUpdateQty = (sparePartId: string, newQty: number) => {
    const spare = spares.find(s => s.id === sparePartId)
    if (!spare || newQty < 1 || newQty > spare.stockQuantity) return
    onChange(
      selectedParts.map(p =>
        p.sparePartId === sparePartId ? { ...p, quantity: newQty } : p
      )
    )
  }

  const pickedSpare = spares.find(s => s.id === pickingPartId)
  const alreadyPickedQty = selectedParts.find(p => p.sparePartId === pickingPartId)?.quantity || 0
  const maxAddable = pickedSpare ? Math.max(0, pickedSpare.stockQuantity - alreadyPickedQty) : 0

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.55)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      padding: '0.9rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <label style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
          🔧 Spares Consumed (Auto-Deduct Inventory)
        </label>
        {loading && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Loading spares...</span>}
      </div>

      {/* Picker Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 78px auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.65rem' }}>
        <select
          aria-label="Select spare part from inventory"
          value={pickingPartId}
          onChange={(e) => {
            setPickingPartId(e.target.value)
            setPickingQty(1)
          }}
          style={{ margin: 0, padding: '0.5rem 0.65rem', fontSize: '0.85rem' }}
        >
          <option value="">-- Select Spare Part from Inventory --</option>
          {spares.map(s => {
            const used = selectedParts.find(p => p.sparePartId === s.id)?.quantity || 0
            const avail = s.stockQuantity - used
            return (
              <option key={s.id} value={s.id} disabled={avail <= 0}>
                {s.partNumber} — {s.name} (Stock: {avail}{avail <= 0 ? ' - Out' : ''})
              </option>
            )
          })}
        </select>

        <input
          type="number"
          min={1}
          max={maxAddable || 1}
          value={pickingQty}
          onChange={(e) => setPickingQty(Math.max(1, parseInt(e.target.value) || 1))}
          disabled={!pickingPartId}
          style={{ margin: 0, padding: '0.5rem', fontSize: '0.85rem', textAlign: 'center' }}
          title="Quantity used"
        />

        <button
          type="button"
          onClick={handleAddPart}
          disabled={!pickingPartId || pickingQty < 1 || pickingQty > maxAddable}
          className="btn"
          style={{
            padding: '0.5rem 0.85rem',
            fontSize: '0.82rem',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.35)'
          }}
        >
          + Add
        </button>
      </div>

      {/* Selected Parts List */}
      {selectedParts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.75rem' }}>
          {selectedParts.map(item => {
            const spare = spares.find(s => s.id === item.sparePartId)
            if (!spare) return null
            const remaining = spare.stockQuantity - item.quantity
            const willTriggerLow = remaining <= spare.reorderLevel

            return (
              <div
                key={item.sparePartId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  background: willTriggerLow ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                  border: willTriggerLow ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                  fontSize: '0.82rem'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {spare.partNumber} — {spare.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: willTriggerLow ? '#fbbf24' : '#94a3b8' }}>
                    Stock: {spare.stockQuantity} &rarr; <strong>{remaining}</strong>
                    {willTriggerLow && ` (⚠ Low Stock ≤ ${spare.reorderLevel})`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="number"
                    min={1}
                    max={spare.stockQuantity}
                    value={item.quantity}
                    onChange={(e) => handleUpdateQty(item.sparePartId, parseInt(e.target.value) || 1)}
                    style={{
                      margin: 0,
                      width: '56px',
                      padding: '0.25rem 0.35rem',
                      fontSize: '0.82rem',
                      textAlign: 'center'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePart(item.sparePartId)}
                    style={{
                      background: 'rgba(244, 63, 94, 0.15)',
                      color: '#fb7185',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      borderRadius: '6px',
                      padding: '0.25rem 0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.78rem'
                    }}
                    title="Remove part"
                  >
                    &times;
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Optional manual consumables / unlisted parts */}
      {onManualNotesChange && (
        <div>
          <input
            type="text"
            value={manualNotes}
            onChange={(e) => onManualNotesChange(e.target.value)}
            placeholder="Other consumables / unlisted parts (optional)..."
            style={{ margin: 0, padding: '0.45rem 0.65rem', fontSize: '0.82rem' }}
          />
        </div>
      )}
    </div>
  )
}
