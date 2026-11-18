"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function ScheduleMaintenanceModal({ machines }: { machines: { id: string, name: string }[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId: formData.get('machineId'),
        description: formData.get('description'),
        status: 'Pending',
        dueDate: new Date(formData.get('dueDate') as string).toISOString()
      })
    })

    setLoading(false)
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>Schedule Maintenance</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Schedule Maintenance">
        <form onSubmit={handleSubmit}>
          <label>Select Machine</label>
          <select name="machineId" required>
            <option value="">-- Choose Machine --</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          
          <label>Description</label>
          <textarea name="description" required rows={3} placeholder="e.g. 500hr Engine Service"></textarea>
          
          <label>Due Date</label>
          <input type="date" name="dueDate" required />
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Scheduling...' : 'Confirm Schedule'}
          </button>
        </form>
      </Modal>
    </>
  )
}
