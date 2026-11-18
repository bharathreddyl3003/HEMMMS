"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function AddPartModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    await fetch('/api/spares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        partNumber: formData.get('partNumber'),
        stockQuantity: parseInt(formData.get('stockQuantity') as string),
        reorderLevel: parseInt(formData.get('reorderLevel') as string)
      })
    })

    setLoading(false)
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>+ Add New Part</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add New Spare Part">
        <form onSubmit={handleSubmit}>
          <label>Part Name</label>
          <input type="text" name="name" required placeholder="e.g. O-Ring" />
          
          <label>Part Number</label>
          <input type="text" name="partNumber" required placeholder="e.g. OR-123" />
          
          <label>Initial Stock Quantity</label>
          <input type="number" name="stockQuantity" required min="0" defaultValue="0" />
          
          <label>Reorder Level (Alert Threshold)</label>
          <input type="number" name="reorderLevel" required min="0" defaultValue="0" />
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Adding...' : 'Save Part'}
          </button>
        </form>
      </Modal>
    </>
  )
}
