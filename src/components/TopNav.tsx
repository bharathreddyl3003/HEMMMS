"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import NavIcon from './NavIcon'

interface NavItem {
  href: string
  label: string
  icon: string
  highlight?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'grid' },
  { href: '/inventory', label: 'Spares', icon: 'box' },
]

export default function TopNav({
  user
}: {
  user: { username: string; role: string } | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

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
                onClick={() => setMobileOpen(false)}
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
