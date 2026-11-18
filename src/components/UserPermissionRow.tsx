"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function UserPermissionRow({ user }: { user: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const togglePermission = async (field: string, currentValue: boolean) => {
    setLoading(true)
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !currentValue })
    })
    setLoading(false)
    router.refresh()
  }

  if (user.role === 'ADMIN') {
    return (
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '1rem' }}><strong>{user.username}</strong></td>
        <td style={{ padding: '1rem' }}><span className="badge accent">{user.role}</span></td>
        <td colSpan={5} style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Admins have all permissions
        </td>
      </tr>
    )
  }

  return (
    <tr style={{ borderBottom: '1px solid var(--border)', opacity: loading ? 0.5 : 1 }}>
      <td style={{ padding: '1rem' }}><strong>{user.username}</strong></td>
      <td style={{ padding: '1rem' }}><span className="badge" style={{ background: 'var(--surface-hover)' }}>{user.role}</span></td>
      
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={user.canEditMachines} 
          onChange={() => togglePermission('canEditMachines', user.canEditMachines)}
          disabled={loading}
          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
        />
      </td>
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={user.canEditSpares} 
          onChange={() => togglePermission('canEditSpares', user.canEditSpares)}
          disabled={loading}
          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
        />
      </td>
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={user.canManageMaintenance} 
          onChange={() => togglePermission('canManageMaintenance', user.canManageMaintenance)}
          disabled={loading}
          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
        />
      </td>
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={user.canManagePRs} 
          onChange={() => togglePermission('canManagePRs', user.canManagePRs)}
          disabled={loading}
          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
        />
      </td>
      <td style={{ padding: '1rem', textAlign: 'center' }}>
        <input 
          type="checkbox" 
          checked={user.canManageScheduledMaintenance} 
          onChange={() => togglePermission('canManageScheduledMaintenance', user.canManageScheduledMaintenance)}
          disabled={loading}
          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
        />
      </td>
    </tr>
  )
}
