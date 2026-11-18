"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function EditMachineModal({ machine }: { machine: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch(`/api/machines/${machine.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        model: formData.get('model'),
        type: formData.get('type'),
        status: formData.get('status'),
        runningHours: parseInt(formData.get('runningHours') as string, 10),
        serialNumber: formData.get('serialNumber') || null,
        commissioningDate: formData.get('commissioningDate') ? new Date(formData.get('commissioningDate') as string).toISOString() : null,
      })
    })

    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to update machine')
    }
    setLoading(false)
  }
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${machine.name}? This will permanently delete all associated subassemblies and maintenance logs.`)) return
    
    setLoading(true)
    const res = await fetch(`/api/machines/${machine.id}`, { method: 'DELETE' })
    if (res.ok) {
      setIsOpen(false)
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to delete machine')
      setLoading(false)
    }
  }

  return (
    <>
      <button className="btn" onClick={() => setIsOpen(true)}>Edit Machine</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Edit ${machine.name}`}>
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Machine Name</label>
          <input type="text" name="name" defaultValue={machine.name} required />
          
          <label>Model</label>
          <input type="text" name="model" defaultValue={machine.model} required />
          
          <label>Type</label>
          <input type="text" name="type" defaultValue={machine.type} required />
          
          <label>Status</label>
          <select name="status" defaultValue={machine.status} required>
            <option value="Working">Working</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Breakdown">Breakdown</option>
          </select>

          <label>Serial Number (Optional)</label>
          <input type="text" name="serialNumber" defaultValue={machine.serialNumber || ''} placeholder="e.g. S/N 12345" />

          <label>Commissioning Date (Optional)</label>
          <input type="date" name="commissioningDate" defaultValue={machine.commissioningDate ? new Date(machine.commissioningDate).toISOString().split('T')[0] : ''} />
          
          <label>Running Hours</label>
          <input type="number" name="runningHours" defaultValue={machine.runningHours} required />
          
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn" onClick={handleDelete} style={{ flex: 1, backgroundColor: 'var(--danger)' }} disabled={loading}>
              Delete
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
