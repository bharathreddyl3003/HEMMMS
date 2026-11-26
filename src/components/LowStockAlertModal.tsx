"use client"

import React from 'react'
import Link from 'next/link'
import Modal from './Modal'
import type { LowStockAlert } from '@/lib/spares'

interface LowStockAlertModalProps {
  alerts: LowStockAlert[]
  onClose: () => void
}

export default function LowStockAlertModal({
  alerts,
  onClose
}: LowStockAlertModalProps) {
  if (alerts.length === 0) return null

  return (
    <Modal
      isOpen={alerts.length > 0}
      onClose={onClose}
      title="⚠ Low Stock Alert — Restock Needed"
      maxWidth="520px"
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
          {alerts.map(item => (
            <div
              key={item.id}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '0.9rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.75rem'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Part #: <strong>{item.partNumber}</strong> &bull; Suggested restock: <strong style={{ color: '#fbbf24' }}>{item.suggestedOrderQty}</strong>
                </div>
              </div>
              <span className="badge danger tabular-nums" style={{ fontSize: '0.75rem' }}>
                {item.stockQuantity} left (Min: {item.reorderLevel})
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.25rem' }}>
          <Link href="/inventory" className="btn btn-secondary" onClick={onClose}>
            Open Spares Inventory &rarr;
          </Link>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}
