"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function CreatePRModal({ 
  spareParts, 
  defaultSparePartId = "" 
}: { 
  spareParts: { id: string, name: string, partNumber: string }[],
  defaultSparePartId?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    await fetch('/api/requisitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sparePartId: formData.get('sparePartId'),
        quantity: parseInt(formData.get('quantity') as string),
        status: 'Pending',
        orderDate: new Date().toISOString()
      })
    })

    setLoading(false)
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button 
        className="btn btn-primary" 
        onClick={() => setIsOpen(true)}
        style={defaultSparePartId ? { padding: '0.25rem 0.75rem', fontSize: '0.875rem' } : {}}
      >
        {defaultSparePartId ? 'Create PR' : '+ New PR'}
      </button>
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create Purchase Requisition">
        <form onSubmit={handleSubmit}>
          <label>Select Spare Part</label>
          <select name="sparePartId" required defaultValue={defaultSparePartId}>
            <option value="">-- Choose Part --</option>
            {spareParts.map(sp => (
              <option key={sp.id} value={sp.id}>{sp.partNumber} - {sp.name}</option>
            ))}
          </select>
          
          <label>Quantity</label>
          <input type="number" name="quantity" required min="1" defaultValue="1" />
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Submit PR'}
          </button>
        </form>
      </Modal>
    </>
  )
}
