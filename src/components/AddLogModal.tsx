"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function AddLogModal({ machineId }: { machineId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId,
        description: formData.get('description'),
        logType: formData.get('logType'),
        hmr: formData.get('hmr') ? parseFloat(formData.get('hmr') as string) : null,
        status: formData.get('status'),
      })
    })

    if (!res.ok) {
      const data = await res.json()
      alert('Failed to add log: ' + (data.error || res.statusText))
    } else {
      setIsOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <button className="btn btn-primary mt-4" style={{ width: '100%' }} onClick={() => setIsOpen(true)}>+ Add Log</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Maintenance Log">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label>Log Type</label>
            <select name="logType" required defaultValue="Routine">
              <option value="Routine">Routine</option>
              <option value="Repair">Repair</option>
              <option value="Incident">Incident</option>
            </select>
          </div>

          <div>
            <label>Description</label>
            <textarea name="description" required rows={3} placeholder="e.g. Replaced Engine Filter"></textarea>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label>Current HMR (Optional)</label>
              <input type="number" step="0.1" name="hmr" placeholder="e.g. 1500.5" />
            </div>
            <div>
              <label>Status</label>
              <select name="status" required defaultValue="Completed">
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Adding...' : 'Add Log'}
          </button>
        </form>
      </Modal>
    </>
  )
}
