"use client"

import { useState } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'

interface AddLogModalProps {
  machineId: string
  defaultLogType?: string
  defaultSubassembly?: string
  currentHmr?: number
  buttonText?: string
  buttonClass?: string
}

export default function AddLogModal({
  machineId,
  defaultLogType = 'Routine',
  defaultSubassembly = 'Engine',
  currentHmr,
  buttonText = '+ Add Log',
  buttonClass = 'btn btn-primary mt-4'
}: AddLogModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [logType, setLogType] = useState(defaultLogType)
  const [subassembly, setSubassembly] = useState(defaultSubassembly)
  const [resetSchedule, setResetSchedule] = useState(defaultLogType === 'Scheduled Maintenance')
  const router = useRouter()

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setLogType(val)
    if (val === 'Scheduled Maintenance') {
      setResetSchedule(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const hmrVal = formData.get('hmr') ? parseFloat(formData.get('hmr') as string) : null
    const timeSpent = formData.get('timeSpentHrs') ? parseFloat(formData.get('timeSpentHrs') as string) : null
    const costVal = formData.get('cost') ? parseFloat(formData.get('cost') as string) : null

    const res = await fetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId,
        description: formData.get('description'),
        logType,
        subassemblyName: subassembly,
        hmr: hmrVal,
        status: formData.get('status') || 'Completed',
        performedBy: formData.get('performedBy') || null,
        partsUsed: formData.get('partsUsed') || null,
        timeSpentHrs: timeSpent,
        cost: costVal,
        resetSchedule
      })
    })

    if (!res.ok) {
      const data = await res.json()
      alert('Failed to add log: ' + (data.error || res.statusText))
    } else {
      setIsOpen(false)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
      <button 
        className={buttonClass} 
        style={buttonClass.includes('mt-4') ? { width: '100%' } : {}} 
        onClick={() => setIsOpen(true)}
      >
        {buttonText}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Record Maintenance Log">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Log Type</label>
              <select name="logType" value={logType} onChange={handleTypeChange} required>
                <option value="Routine">Routine Service</option>
                <option value="Scheduled Maintenance">Scheduled Maintenance</option>
                <option value="Repair">Unscheduled Repair</option>
                <option value="Incident">Breakdown / Incident</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Subassembly / Component</label>
              <select name="subassemblyName" value={subassembly} onChange={(e) => setSubassembly(e.target.value)}>
                <option value="Engine">Engine Side</option>
                <option value="Compressor">Compressor Side</option>
                <option value="Hydraulic">Hydraulic Side</option>
                <option value="Rotary Head">Rotary Head</option>
                <option value="General">General / Undercarriage</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Work Description</label>
            <textarea 
              name="description" 
              required 
              rows={3} 
              placeholder="e.g. Completed 250hr service. Replaced oil filter, engine oil, fuel filters and checked belts."
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Machine HMR</label>
              <input 
                type="number" 
                step="0.1" 
                name="hmr" 
                defaultValue={currentHmr || ''} 
                placeholder="e.g. 29595.0" 
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Performed By (Technician)</label>
              <input 
                type="text" 
                name="performedBy" 
                placeholder="e.g. John Doe / Fleet Mech" 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Downtime / Labor (Hours)</label>
              <input 
                type="number" 
                step="0.1" 
                name="timeSpentHrs" 
                placeholder="e.g. 2.5" 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Cost ($ / ₹)</label>
              <input 
                type="number" 
                step="0.01" 
                name="cost" 
                placeholder="e.g. 250.00" 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Parts / Spares Consumed</label>
            <input 
              type="text" 
              name="partsUsed" 
              placeholder="e.g. EF-001 (Engine Filter), HO-20 (Hydraulic Oil 20L)" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
              <select name="status" required defaultValue="Completed">
                <option value="Completed">Completed</option>
                <option value="Pending">Pending / In Progress</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.2rem' }}>
              <input 
                type="checkbox" 
                id="resetScheduleCheckbox"
                checked={resetSchedule} 
                onChange={(e) => setResetSchedule(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="resetScheduleCheckbox" style={{ fontSize: '0.82rem', cursor: 'pointer', margin: 0 }}>
                Reset {subassembly} schedule clock to this HMR
              </label>
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary mt-3" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
            {loading ? 'Recording Service...' : 'Save Maintenance Log'}
          </button>
        </form>
      </Modal>
    </>
  )
}
