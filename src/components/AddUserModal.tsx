"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

export default function AddUserModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password'),
        canEditMachines: formData.get('canEditMachines') === 'on',
        canEditSpares: formData.get('canEditSpares') === 'on',
        canManageMaintenance: formData.get('canManageMaintenance') === 'on',
        canManagePRs: formData.get('canManagePRs') === 'on',
        canManageScheduledMaintenance: formData.get('canManageScheduledMaintenance') === 'on',
      })
    })

    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to create user')
    }
    setLoading(false)
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setIsOpen(true)}>+ Add User</button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Create New User">
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Username</label>
          <input type="text" name="username" required />
          
          <label>Password</label>
          <input type="password" name="password" required />
          
          <h3 className="mt-4 mb-2 text-sm">Initial Permissions</h3>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="canEditMachines" style={{ width: 'auto', marginBottom: 0 }} />
            Edit Machines & Subassemblies
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="canEditSpares" style={{ width: 'auto', marginBottom: 0 }} />
            Edit Inventory & Spares
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="canManageMaintenance" style={{ width: 'auto', marginBottom: 0 }} />
            Manage Maintenance Logs
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.5rem' }}>
            <input type="checkbox" name="canManagePRs" style={{ width: 'auto', marginBottom: 0 }} />
            Manage Purchase Requisitions
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem' }}>
            <input type="checkbox" name="canManageScheduledMaintenance" style={{ width: 'auto', marginBottom: 0 }} />
            Manage Scheduled Maintenance
          </label>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </Modal>
    </>
  )
}
