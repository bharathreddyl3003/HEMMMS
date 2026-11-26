"use client"

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AddPartModal from '@/components/AddPartModal'
import Modal from '@/components/Modal'

export interface SparePartRow {
  id: string
  name: string
  partNumber: string
  stockQuantity: number
  reorderLevel: number
}

interface InventoryViewProps {
  initialSpares: SparePartRow[]
  canEdit: boolean
}

export default function InventoryView({ initialSpares, canEdit }: InventoryViewProps) {
  const router = useRouter()
  const [spares, setSpares] = useState<SparePartRow[]>(initialSpares)
  const [searchQuery, setSearchQuery] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all')

  // Restock / Adjust modal state
  const [editingPart, setEditingPart] = useState<SparePartRow | null>(null)
  const [newQty, setNewQty] = useState<number>(0)
  const [newReorder, setNewReorder] = useState<number>(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const lowStockCount = useMemo(
    () => spares.filter(s => s.stockQuantity <= s.reorderLevel).length,
    [spares]
  )
  const totalUnits = useMemo(
    () => spares.reduce((sum, s) => sum + s.stockQuantity, 0),
    [spares]
  )

  const filteredSpares = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return spares.filter(s => {
      if (stockFilter === 'low' && s.stockQuantity > s.reorderLevel) return false
      if (!q) return true
      return (
        s.name.toLowerCase().includes(q) ||
        s.partNumber.toLowerCase().includes(q)
      )
    })
  }, [spares, searchQuery, stockFilter])

  const openAdjustModal = (part: SparePartRow) => {
    setEditingPart(part)
    setNewQty(part.stockQuantity)
    setNewReorder(part.reorderLevel)
    setError('')
  }

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPart) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/spares/${editingPart.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockQuantity: newQty,
          reorderLevel: newReorder,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update stock')
        setSaving(false)
        return
      }

      setSpares(prev =>
        prev.map(p => (p.id === editingPart.id ? { ...p, stockQuantity: data.stockQuantity, reorderLevel: data.reorderLevel } : p))
      )
      setEditingPart(null)
      router.refresh()
    } catch {
      setError('Network error while updating stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '0.3rem' }}>
            Storehouse &amp; Consumables Control
          </div>
          <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Spares Inventory
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Filters, lubricants, wear parts, and automatic low-stock alert thresholds
          </p>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <AddPartModal />
          </div>
        )}
      </div>

      {/* Inventory Telemetry Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Total SKUs
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#f8fafc' }}>
            {spares.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Total Units in Stock
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#34d399' }}>
            {totalUnits.toLocaleString()}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: `3px solid ${lowStockCount > 0 ? '#f43f5e' : '#10b981'}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Low Stock Alerts
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: lowStockCount > 0 ? '#fb7185' : '#34d399' }}>
            {lowStockCount}
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="glass-panel mb-4" style={{ padding: '0.85rem 1.1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'inline-flex', gap: '0.4rem' }} role="group" aria-label="Filter Spares">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: stockFilter === 'all' ? 700 : 500,
                cursor: 'pointer',
                background: stockFilter === 'all' ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255,255,255,0.04)',
                color: stockFilter === 'all' ? '#38bdf8' : 'var(--text-secondary)',
                border: stockFilter === 'all' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid var(--border)',
              }}
            >
              All SKUs ({spares.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: stockFilter === 'low' ? 700 : 500,
                cursor: 'pointer',
                background: stockFilter === 'low' ? 'rgba(244, 63, 94, 0.16)' : 'rgba(255,255,255,0.04)',
                color: stockFilter === 'low' ? '#fb7185' : 'var(--text-secondary)',
                border: stockFilter === 'low' ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid var(--border)',
              }}
            >
              Low Stock Only ({lowStockCount})
            </button>
          </div>

          <input
            type="search"
            aria-label="Search spare parts"
            placeholder="Search part number or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              margin: 0,
              width: 'min(100%, 280px)',
              padding: '0.48rem 0.85rem',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div tabIndex={0} role="region" aria-label="Spares Inventory Table" className="table-wrapper" style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}>
          <table className="hemmms-table" style={{ minWidth: '680px' }}>
            <thead>
              <tr>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Part Number</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Name</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Stock Quantity</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Reorder Level</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Status</th>
                {canEdit && <th scope="col" style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filteredSpares.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    {spares.length === 0 ? 'No spare parts registered yet.' : 'No spare parts match the current filter.'}
                  </td>
                </tr>
              ) : filteredSpares.map((spare) => {
                const needsReorder = spare.stockQuantity <= spare.reorderLevel
                return (
                  <tr
                    key={spare.id}
                    style={{
                      background: needsReorder ? 'rgba(244, 63, 94, 0.04)' : undefined,
                      boxShadow: needsReorder ? 'inset 3px 0 0 #f43f5e' : undefined,
                    }}
                  >
                    <th scope="row" className="tabular-nums" style={{ padding: '0.95rem 1rem', color: '#38bdf8', fontWeight: 700, textAlign: 'left' }}>
                      {spare.partNumber}
                    </th>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 500, color: '#f8fafc' }}>{spare.name}</td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', fontWeight: 600, color: needsReorder ? '#fb7185' : '#e2e8f0' }}>
                      {spare.stockQuantity}
                    </td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', color: '#94a3b8' }}>
                      {spare.reorderLevel}
                    </td>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {needsReorder ? (
                        <span className="badge danger">Low Stock</span>
                      ) : (
                        <span className="badge success">In Stock</span>
                      )}
                    </td>
                    {canEdit && (
                      <td style={{ padding: '0.95rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openAdjustModal(spare)}
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.78rem', fontSize: '0.78rem', minBlockSize: '30px' }}
                        >
                          Restock / Adjust
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock / Adjust Stock Modal */}
      <Modal
        isOpen={!!editingPart}
        onClose={() => setEditingPart(null)}
        title={editingPart ? `Adjust Stock — ${editingPart.partNumber}` : 'Adjust Stock'}
      >
        {editingPart && (
          <form onSubmit={handleSaveAdjustment}>
            {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
            <p className="text-sm mb-3">
              <strong style={{ color: '#f8fafc' }}>{editingPart.name}</strong> (Current: {editingPart.stockQuantity})
            </p>

            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {[5, 10, 25].map((delta) => (
                <button
                  key={delta}
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', minBlockSize: '32px' }}
                  onClick={() => setNewQty((q) => Math.max(0, q + delta))}
                >
                  +{delta} units
                </button>
              ))}
            </div>

            <label htmlFor="adjust-stock-qty">Stock Quantity</label>
            <input
              id="adjust-stock-qty"
              type="number"
              min={0}
              step={1}
              required
              value={newQty}
              onChange={(e) => setNewQty(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />

            <label htmlFor="adjust-reorder-lvl">Reorder Level</label>
            <input
              id="adjust-reorder-lvl"
              type="number"
              min={0}
              step={1}
              required
              value={newReorder}
              onChange={(e) => setNewReorder(Math.max(0, parseInt(e.target.value || '0', 10)))}
            />

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Stock Update'}
            </button>
          </form>
        )}
      </Modal>
    </main>
  )
}
