import React from 'react'

interface EquipmentIconProps {
  category?: string | null
  size?: number
}

/**
 * Custom crisp engineering SVG icon distinguishing Hydraulic Shovels
 * from Blast-Hole Rotary Drills without relying on OS emojis.
 */
export default function EquipmentIcon({ category, size = 18 }: EquipmentIconProps) {
  const isShovel = category === 'Shovel'

  if (isShovel) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ color: '#38bdf8', flexShrink: 0 }}
      >
        {/* Track undercarriage */}
        <rect x="2" y="17" width="12" height="3.5" rx="1.75" />
        {/* Upper house / cab */}
        <path d="M4 17v-4.5a1 1 0 0 1 1-1h5v5.5" />
        {/* Boom, stick, and bucket */}
        <path d="M10 13.5 15 6l4 4.5" />
        <path d="M18.5 10.5 22 12l-1.2 4.2-3.5-.8z" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ color: '#2dd4bf', flexShrink: 0 }}
    >
      {/* Carrier base & jacks */}
      <rect x="3" y="17.5" width="11" height="3" rx="1.5" />
      <path d="M5 17.5v-4h6v4" />
      {/* Vertical drill mast / derrick */}
      <path d="M15.5 20V3.5h3V20" />
      <line x1="17" y1="6.5" x2="17" y2="21.5" />
      {/* Rotary bit tip */}
      <path d="M15.8 20.5 17 22l1.2-1.5" />
    </svg>
  )
}
