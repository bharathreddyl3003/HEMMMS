"use client"

import React, { useState, useEffect } from 'react'
import Modal from './Modal'
import type { LowStockAlert } from '@/lib/spares'

interface LowStockAlertModalProps {
  alerts: LowStockAlert[]
  onClose: () => void
  onPrCreated?: () => void
}

export default function LowStockAlertModal({
  alerts,
  onClose,
  onPrCreated
}: LowStockAlertModalProps) {
  const [quantities, setQuantities] = useState<{ [id: string]: number }>({})
  const [prStatus, setPrStatus] = useState<{ [id: string]: 'idle' | 'submitting' | 'created' | 'error' }>({})
  const [prError, setPrError] = useState<{ [id: string]: string }>({})

  useEffect(() => {
    const qtyMap: { [id: string]: number } = {}
    alerts.forEach(a => {
      qtyMap[a.id] = a.suggestedOrderQty
    })
    setQuantities(qtyMap)
    setPrStatus({})
    setPrError({})
  }, [alerts])

  if (alerts.length === 0) return null

  const handleGeneratePR = async (alertItem: LowStockAlert) => {
    const qty = quantities[alertItem.id] || alertItem.suggestedOrderQty
    setPrStatus(prev => ({ ...prev, [alertItem.id]: 'submitting' }))
    setPrError(prev => ({ ...prev, [alertItem.id]: '' }))

    try {
      const res = await fetch('/api/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sparePartId: alertItem.id,
          quantity: qty,
          status: 'Pending',
          orderDate: new Date().toISOString()
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create PR')
      }

      setPrStatus(prev => ({ ...prev, [alertItem.id]: 'created' }))
      if (onPrCreated) onPrCreated()
    } catch (err: any) {
      setPrStatus(prev => ({ ...prev, [alertItem.id]: 'error' }))
      setPrError(prev => ({ ...prev, [alertItem.id]: err.message || 'Permission denied or error' }))
    }
  }

  return (
    <Modal
      isOpen={alerts.length > 0}
      onClose={onClose}
      title="⚠ Low Stock Alert — Purchase Requisition Needed"
      maxWidth="540px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '10px',
          padding: '0.85rem',
          fontSize: '0.88rem',
          color: '#fde68a'
        }}>
          Service recorded &amp; inventory deducted! The following spare parts have fallen to or below their reorder level:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {alerts.map(item => {
            const status = prStatus[item.id] || 'idle'
            const errMsg = prError[item.id]

            return (
              <div
                key={item.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      Part #: <strong>{item.partNumber}</strong>
                    </div>
                  </div>
                  <span className="badge danger" style={{ fontSize: '0.75rem' }}>
                    {item.stockQuantity} left (Min: {item.reorderLevel})
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>Order Qty:</label>
                    <input
                      type="number"
                      min={1}
                      value={quantities[item.id] ?? item.suggestedOrderQty}
                      onChange={(e) => setQuantities(prev => ({
                        ...prev,
                        [item.id]: Math.max(1, parseInt(e.target.value) || 1)
                      }))}
                      disabled={status === 'created' || status === 'submitting'}
                      style={{ margin: 0, width: '76px', padding: '0.35rem 0.5rem', fontSize: '0.85rem', textAlign: 'center' }}
                    />
                  </div>

                  {status === 'created' ? (
                    <span className="badge success" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                      ✓ PR Created
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleGeneratePR(item)}
                      disabled={status === 'submitting'}
                      className="btn btn-primary"
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem' }}
                    >
                      {status === 'submitting' ? 'Creating PR...' : '+ Generate PR'}
                    </button>
                  )}
                </div>

                {errMsg && (
                  <div style={{ fontSize: '0.78rem', color: '#fb7185' }}>
                    ⚠ {errMsg}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
          <button type="button" className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
