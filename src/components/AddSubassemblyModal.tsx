"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function AddSubassemblyModal({ machineId }: { machineId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch(`/api/subassemblies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId,
        name: formData.get('name'),
        healthStatus: formData.get('healthStatus'),
        currentHours: parseInt(formData.get('currentHours') as string, 10) || 0,
        lifeExpectancyHours: parseInt(formData.get('lifeExpectancyHours') as string, 10),
      })
    })

    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to add subassembly')
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="btn btn-primary btn-sm"
      >
        + Add Subassembly
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Add New Subassembly`}>
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Subassembly Name</label>
          <input type="text" name="name" required placeholder="e.g. Hydraulic Pump" />
          
          <label>Health Status</label>
          <select name="healthStatus" required defaultValue="Good">
            <option value="Good">Good</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
          
          <label>Initial Current Hours</label>
          <input type="number" name="currentHours" required defaultValue={0} />
          
          <label>Life Expectancy (Hours)</label>
          <input type="number" name="lifeExpectancyHours" required placeholder="e.g. 5000" />
          
          <button type="submit" className="btn btn-primary mt-4" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Adding...' : 'Add Subassembly'}
          </button>
        </form>
      </Modal>
    </>
  )
}
