"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function AddMachineModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch(`/api/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        model: formData.get('model'),
        type: formData.get('type'),
        status: formData.get('status'),
        runningHours: parseInt(formData.get('runningHours') as string, 10) || 0,
        serialNumber: formData.get('serialNumber') || null,
        commissioningDate: formData.get('commissioningDate') ? new Date(formData.get('commissioningDate') as string).toISOString() : null,
      })
    })

    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to add machine')
    }
    setLoading(false)
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>Add Machine</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Add New Machine`}>
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Machine Name</label>
          <input type="text" name="name" required placeholder="e.g. Dumper 101" />
          
          <label>Model</label>
          <input type="text" name="model" required placeholder="e.g. REL650" />
          
          <label>Type</label>
          <input type="text" name="type" required defaultValue="RBH 150mm drill" />
          
          <label>Status</label>
          <select name="status" required defaultValue="Working">
            <option value="Working">Working</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Breakdown">Breakdown</option>
          </select>

          <label>Serial Number (Optional)</label>
          <input type="text" name="serialNumber" placeholder="e.g. S/N 12345" />

          <label>Commissioning Date (Optional)</label>
          <input type="date" name="commissioningDate" />
          
          <label>Initial Running Hours</label>
          <input type="number" name="runningHours" required defaultValue={0} />
          
          <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Adding...' : 'Add Machine'}
          </button>
        </form>
      </Modal>
    </>
  )
}
