"use client"

import React, { useEffect, useId, useRef } from 'react'

export default function Modal({
  isOpen,
  onClose,
  title,
  maxWidth = '420px',
  children
}: {
  isOpen: boolean
  onClose: () => void
  title: string
  maxWidth?: string
  children: React.ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressedOutsideRef = useRef(false)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  const isOutsideRect = (e: React.PointerEvent<HTMLDialogElement>, dialog: HTMLDialogElement) => {
    const r = dialog.getBoundingClientRect()
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
  }

  return (
    <dialog
      ref={dialogRef}
      className="hemmms-dialog"
      aria-labelledby={titleId}
      style={{ width: maxWidth }}
      onClose={() => {
        if (isOpen) onClose()
      }}
      onPointerDown={(e) => {
        const dialog = dialogRef.current
        if (!dialog) return
        pressedOutsideRef.current = isOutsideRect(e, dialog)
      }}
      onPointerUp={(e) => {
        const dialog = dialogRef.current
        if (!dialog) return
        if (pressedOutsideRef.current && isOutsideRect(e, dialog)) {
          dialog.close()
        }
        pressedOutsideRef.current = false
      }}
    >
      {isOpen && (
        <div className="dialog-inner">
          <div className="dialog-header">
            <h2 id={titleId} style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="dialog-close-btn"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
