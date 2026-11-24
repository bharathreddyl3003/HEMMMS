"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function TopNav({ 
  user 
}: { 
  user: { username: string, role: string } | null 
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (!user) return null // Hide nav if not logged in

  return (
    <nav className="top-nav">
      <Link href="/" style={{ textDecoration: 'none' }}>
        <div className="nav-logo">HEMMMS</div>
      </Link>
      <div className="nav-links" style={{ display: 'flex', alignItems: 'center' }}>
        <Link href="/" className={pathname === '/' ? 'active' : ''}>Dashboard</Link>
        <Link href="/hmr-register" className={pathname === '/hmr-register' ? 'active' : ''}>HMR Register</Link>
        <Link href="/maintenance-status" className={pathname === '/maintenance-status' ? 'active' : ''}>Maintenance Status</Link>
        <Link href="/reports" className={pathname === '/reports' ? 'active' : ''}>Reports & Analytics</Link>
        <Link href="/inventory" className={pathname === '/inventory' ? 'active' : ''}>Inventory & Spares</Link>
        <Link href="/requisitions" className={pathname === '/requisitions' ? 'active' : ''}>Purchase Requisitions</Link>
        
        <Link 
          href="/mobile-hmr" 
          className={pathname === '/mobile-hmr' ? 'active' : ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            color: '#38bdf8'
          }}
        >
          <span>📱</span> Field HMR
        </Link>
        
        {user.role === 'ADMIN' && (
          <Link href="/admin/users" className={pathname === '/admin/users' ? 'active' : ''}>Users (Admin)</Link>
        )}
        
        <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
        
        <span className="text-sm">Hi, <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user.username}</strong></span>
        <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
          Logout
        </button>
      </div>
    </nav>
  )
}
