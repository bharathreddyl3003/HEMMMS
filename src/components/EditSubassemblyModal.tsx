"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function EditSubassemblyModal({ subassembly }: { subassembly: any }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch(`/api/subassemblies/${subassembly.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        healthStatus: formData.get('healthStatus'),
        currentHours: parseInt(formData.get('currentHours') as string, 10),
        lifeExpectancyHours: parseInt(formData.get('lifeExpectancyHours') as string, 10),
      })
    })

    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to update subassembly')
    }
    setLoading(false)
  }
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${subassembly.name}?`)) return
    
    setLoading(true)
    const res = await fetch(`/api/subassemblies/${subassembly.id}`, { method: 'DELETE' })
    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to delete subassembly')
      setLoading(false)
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--accent)', 
          cursor: 'pointer', 
          padding: '0.25rem' 
        }}>
        Edit
      </button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Edit ${subassembly.name}`}>
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Subassembly Name</label>
          <input type="text" name="name" defaultValue={subassembly.name} required />
          
          <label>Health Status</label>
          <select name="healthStatus" defaultValue={subassembly.healthStatus} required>
            <option value="Good">Good</option>
            <option value="Warning">Warning</option>
            <option value="Critical">Critical</option>
          </select>
          
          <label>Current Hours</label>
          <input type="number" name="currentHours" defaultValue={subassembly.currentHours} required />
          
          <label>Life Expectancy (Hours)</label>
          <input type="number" name="lifeExpectancyHours" defaultValue={subassembly.lifeExpectancyHours} required />
          
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
