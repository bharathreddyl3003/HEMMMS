"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: 'grid' },
  { href: '/hmr-register', label: 'HMR Register', icon: 'clock' },
  { href: '/maintenance-status', label: 'Maintenance', icon: 'wrench' },
  { href: '/reports', label: 'Analytics', icon: 'chart' },
  { href: '/inventory', label: 'Spares', icon: 'box' },
  { href: '/requisitions', label: 'Requisitions', icon: 'file' },
  { href: '/mobile-hmr', label: 'Field HMR', icon: 'phone', highlight: true },
]

function NavIcon({ name }: { name: string }) {
  const props = {
    width: 15,
    height: 15,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (name) {
    case 'grid':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
        </svg>
      )
    case 'wrench':
      return (
        <svg {...props}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    case 'box':
      return (
        <svg {...props}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    case 'file':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...props}>
          <rect x="6" y="2" width="12" height="20" rx="2.5" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      )
    case 'users':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    default:
      return null
  }
}

export default function TopNav({
  user
}: {
  user: { username: string; role: string } | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close mobile drawer automatically on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  if (!user) return null

  const items = user.role === 'ADMIN'
    ? [...NAV_ITEMS, { href: '/admin/users', label: 'Users', icon: 'users' }]
    : NAV_ITEMS

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/" prefetch={true} className="nav-brand">
          <div className="nav-logo-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span className="nav-logo">HEMMMS</span>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
              Fleet Telemetry
            </span>
          </div>
        </Link>

        {/* Desktop Inline Navigation */}
        <nav aria-label="Primary" className="nav-desktop-wrap" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <ul className="nav-links">
            {items.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={true}
                    aria-current={isActive ? 'page' : undefined}
                    className={isActive ? 'active' : ''}
                    style={item.highlight && !isActive ? { color: '#38bdf8' } : undefined}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} aria-hidden="true" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.3rem 0.65rem',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{user.username}</span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                background: user.role === 'ADMIN' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(56, 189, 248, 0.16)',
                color: user.role === 'ADMIN' ? '#fbbf24' : '#38bdf8'
              }}>
                {user.role}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="btn"
              style={{ padding: '0.38rem 0.78rem', minBlockSize: '34px', fontSize: '0.8rem' }}
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          className="nav-mobile-toggle"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMobileOpen(prev => !prev)}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
          <span>Menu</span>
        </button>
      </div>

      {/* Responsive Mobile Drawer */}
      {mobileOpen && (
        <nav id="mobile-nav-drawer" aria-label="Mobile" className="nav-mobile-drawer">
          {items.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'active' : ''}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
          <div style={{
            marginTop: '0.4rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span className="text-sm">
              Signed in as <strong style={{ color: '#f8fafc' }}>{user.username}</strong> ({user.role})
            </span>
            <button type="button" onClick={handleLogout} className="btn" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
              Logout
            </button>
          </div>
        </nav>
      )}
    </header>
  )
}
