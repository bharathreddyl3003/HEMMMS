"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavIcon from './NavIcon'

const BOTTOM_ITEMS = [
  { href: '/', label: 'Fleet', icon: 'grid' },
  { href: '/hmr-register', label: 'HMR', icon: 'clock' },
  { href: '/maintenance-status', label: 'Maint', icon: 'wrench' },
  { href: '/mobile-hmr', label: 'Field HMR', icon: 'phone' },
]

/**
 * Sticky thumb-reachable bottom bar rendered below 768px for field operators.
 */
export default function MobileBottomNav({
  user,
}: {
  user: { username: string; role: string } | null
}) {
  const pathname = usePathname()

  if (!user) return null

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Quick Navigation">
      {BOTTOM_ITEMS.map((item) => {
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
    </nav>
  )
}
