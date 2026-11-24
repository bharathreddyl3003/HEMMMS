"use client"

import React from 'react'

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  maxWidth = '400px',
  children 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  title: string, 
  maxWidth?: string,
  children: React.ReactNode 
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, backdropFilter: 'blur(4px)', padding: '1rem'
    }}>
      <div className="glass-panel" style={{ width: maxWidth, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2rem' }}
        >
          &times;
        </button>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem', paddingRight: '1.5rem' }}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
