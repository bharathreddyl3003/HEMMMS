"use client"

import { useState, useId } from 'react'
import Modal from './Modal'
import { useRouter } from 'next/navigation'
import { extractCustomSpecs, type CustomSpecEntry } from '@/lib/machine-details'

export interface EditableMachine {
  id: string
  name: string
  model: string
  category?: string | null
  make?: string | null
  capacity?: string | null
  type: string
  status: string
  runningHours: number
  serialNumber?: string | null
  commissioningDate?: string | Date | null
  assetCode?: string | null
  manufactureYear?: number | null
  deploymentLocation?: string | null
  supervisorName?: string | null
  powerSource?: string | null
  engineDetails?: string | null
  operatingWeight?: string | null
  fluidCapacities?: string | null
  notes?: string | null
  customSpecs?: unknown
}

export default function EditMachineModal({ machine }: { machine: EditableMachine }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customSpecs, setCustomSpecs] = useState<CustomSpecEntry[]>(() => extractCustomSpecs(machine.customSpecs))
  const router = useRouter()
  const baseId = useId()

  const handleOpen = () => {
    setCustomSpecs(extractCustomSpecs(machine.customSpecs))
    setError('')
    setIsOpen(true)
  }

  const handleAddSpecRow = () => {
    setCustomSpecs(prev => [...prev, { label: '', value: '' }])
  }

  const handleSpecChange = (index: number, field: 'label' | 'value', val: string) => {
    setCustomSpecs(prev =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: val } : row))
    )
  }

  const handleRemoveSpecRow = (index: number) => {
    setCustomSpecs(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    for (const row of customSpecs) {
      const hasLabel = row.label.trim().length > 0
      const hasVal = row.value.trim().length > 0
      if (hasLabel !== hasVal) {
        setError('Each custom detail must include both a detail name and a value.')
        return
      }
    }

    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const rawHours = String(formData.get('runningHours') ?? '').trim()
    const rawYear = String(formData.get('manufactureYear') ?? '').trim()
    const cleanedSpecs = customSpecs
      .map(s => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter(s => s.label && s.value)

    try {
      const res = await fetch(`/api/machines/${machine.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          category: formData.get('category'),
          make: formData.get('make') || null,
          capacity: formData.get('capacity') || null,
          model: formData.get('model'),
          type: formData.get('type'),
          status: formData.get('status'),
          runningHours: rawHours === '' ? 0 : parseFloat(rawHours),
          serialNumber: formData.get('serialNumber') || null,
          commissioningDate: formData.get('commissioningDate')
            ? new Date(formData.get('commissioningDate') as string).toISOString()
            : null,
          assetCode: formData.get('assetCode') || null,
          manufactureYear: rawYear === '' ? null : Number(rawYear),
          deploymentLocation: formData.get('deploymentLocation') || null,
          supervisorName: formData.get('supervisorName') || null,
          powerSource: formData.get('powerSource') || null,
          engineDetails: formData.get('engineDetails') || null,
          operatingWeight: formData.get('operatingWeight') || null,
          fluidCapacities: formData.get('fluidCapacities') || null,
          notes: formData.get('notes') || null,
          customSpecs: cleanedSpecs.length > 0 ? cleanedSpecs : null,
        })
      })

      if (res.ok) {
        setIsOpen(false)
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update machine')
      }
    } catch {
      setError('Network error while saving machine details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${machine.name}? This will permanently delete all associated subassemblies and maintenance logs.`)) return

    setLoading(true)
    const res = await fetch(`/api/machines/${machine.id}`, { method: 'DELETE' })
    if (res.ok) {
      setIsOpen(false)
      router.push('/')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to delete machine')
      setLoading(false)
    }
  }

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    color: '#38bdf8',
    margin: '0 0 0.75rem 0',
    paddingBottom: '0.35rem',
    borderBottom: '1px solid rgba(56, 189, 248, 0.2)',
  }

  return (
    <>
      <button type="button" className="btn" onClick={handleOpen}>
        Edit Machine
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Edit Equipment — ${machine.name}`}
        maxWidth="min(95vw, 760px)"
      >
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Section 1: Core Identity & Status */}
          <div>
            <div style={sectionHeadingStyle}>Core Identity &amp; Operations</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label htmlFor={`${baseId}-category`}>Equipment Category</label>
                <select id={`${baseId}-category`} name="category" defaultValue={machine.category || 'Drill'}>
                  <option value="Shovel">Shovel</option>
                  <option value="Drill">Drill</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-name`}>Machine Name / Unit ID</label>
                <input id={`${baseId}-name`} type="text" name="name" defaultValue={machine.name} required />
              </div>
              <div>
                <label htmlFor={`${baseId}-make`}>Make / Manufacturer</label>
                <input id={`${baseId}-make`} type="text" name="make" defaultValue={machine.make || ''} placeholder="e.g. BEML, Tata Hitachi" />
              </div>
              <div>
                <label htmlFor={`${baseId}-model`}>Model</label>
                <input id={`${baseId}-model`} type="text" name="model" defaultValue={machine.model} required />
              </div>
              <div>
                <label htmlFor={`${baseId}-capacity`}>Capacity</label>
                <input id={`${baseId}-capacity`} type="text" name="capacity" defaultValue={machine.capacity || ''} placeholder="e.g. 6.5 Cu.M, 150mm" />
              </div>
              <div>
                <label htmlFor={`${baseId}-type`}>Equipment Class / Type</label>
                <input id={`${baseId}-type`} type="text" name="type" defaultValue={machine.type} required />
              </div>
              <div>
                <label htmlFor={`${baseId}-status`}>Operational Status</label>
                <select id={`${baseId}-status`} name="status" defaultValue={machine.status} required>
                  <option value="Working">Working</option>
                  <option value="Under Maintenance">Under Maintenance</option>
                  <option value="Breakdown">Breakdown</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${baseId}-hmr`}>Running Hours (HMR)</label>
                <input id={`${baseId}-hmr`} type="number" step="0.1" min="0" name="runningHours" defaultValue={machine.runningHours} required />
              </div>
            </div>
          </div>

          {/* Section 2: Asset, Deployment & Ownership */}
          <div>
            <div style={sectionHeadingStyle}>Asset Identification &amp; Site Assignment</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label htmlFor={`${baseId}-assetCode`}>Asset Code / Company ID</label>
                <input id={`${baseId}-assetCode`} type="text" name="assetCode" defaultValue={machine.assetCode || ''} placeholder="e.g. RG2-SH-01" />
              </div>
              <div>
                <label htmlFor={`${baseId}-serialNumber`}>Serial Number</label>
                <input id={`${baseId}-serialNumber`} type="text" name="serialNumber" defaultValue={machine.serialNumber || ''} placeholder="e.g. S/N 12345" />
              </div>
              <div>
                <label htmlFor={`${baseId}-commissioningDate`}>Commissioning Date</label>
                <input
                  id={`${baseId}-commissioningDate`}
                  type="date"
                  name="commissioningDate"
                  defaultValue={machine.commissioningDate ? new Date(machine.commissioningDate).toISOString().split('T')[0] : ''}
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-manufactureYear`}>Manufacture Year</label>
                <input
                  id={`${baseId}-manufactureYear`}
                  type="number"
                  min={1950}
                  max={2100}
                  name="manufactureYear"
                  defaultValue={machine.manufactureYear ?? ''}
                  placeholder="e.g. 2021"
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-location`}>Deployment Location / Bench</label>
                <input
                  id={`${baseId}-location`}
                  type="text"
                  name="deploymentLocation"
                  defaultValue={machine.deploymentLocation || ''}
                  placeholder="e.g. OB Bench 4, Quarry East"
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-supervisor`}>Section In-charge / Engineer</label>
                <input
                  id={`${baseId}-supervisor`}
                  type="text"
                  name="supervisorName"
                  defaultValue={machine.supervisorName || ''}
                  placeholder="e.g. R. Kumar (Senior Engr)"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Technical Specifications & Notes */}
          <div>
            <div style={sectionHeadingStyle}>Powertrain, Capacities &amp; Notes</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.85rem' }}>
              <div>
                <label htmlFor={`${baseId}-powerSource`}>Power Source / Drive</label>
                <input
                  id={`${baseId}-powerSource`}
                  type="text"
                  list={`${baseId}-power-options`}
                  name="powerSource"
                  defaultValue={machine.powerSource || ''}
                  placeholder="e.g. Diesel, Electric, Diesel-Hydraulic"
                />
                <datalist id={`${baseId}-power-options`}>
                  <option value="Diesel" />
                  <option value="Electric" />
                  <option value="Diesel-Hydraulic" />
                  <option value="Diesel-Electric" />
                </datalist>
              </div>
              <div>
                <label htmlFor={`${baseId}-engine`}>Engine / Motor Details</label>
                <input
                  id={`${baseId}-engine`}
                  type="text"
                  name="engineDetails"
                  defaultValue={machine.engineDetails || ''}
                  placeholder="e.g. Cummins QSK23 • 760 HP"
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-weight`}>Operating Weight</label>
                <input
                  id={`${baseId}-weight`}
                  type="text"
                  name="operatingWeight"
                  defaultValue={machine.operatingWeight || ''}
                  placeholder="e.g. 118 Ton"
                />
              </div>
              <div>
                <label htmlFor={`${baseId}-fluids`}>Fuel &amp; Hydraulic Capacities</label>
                <input
                  id={`${baseId}-fluids`}
                  type="text"
                  name="fluidCapacities"
                  defaultValue={machine.fluidCapacities || ''}
                  placeholder="e.g. Fuel 1,400L • Hyd 680L"
                />
              </div>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <label htmlFor={`${baseId}-notes`}>Equipment Notes &amp; Technical Remarks</label>
              <textarea
                id={`${baseId}-notes`}
                name="notes"
                rows={3}
                defaultValue={machine.notes || ''}
                placeholder="Major overhauls, pending modifications, warranty terms, or inspection notes..."
              />
            </div>
          </div>

          {/* Section 4: Flexible Custom Specifications */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', paddingBottom: '0.35rem', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#38bdf8' }}>
                Additional Custom Specifications
              </span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddSpecRow}
                disabled={customSpecs.length >= 30}
                style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem', minBlockSize: '30px' }}
              >
                + Add Custom Detail
              </button>
            </div>

            {customSpecs.length === 0 ? (
              <p className="text-sm" style={{ margin: 0 }}>
                Add custom attributes such as Compressor CFM, Main Pump Model, Track Pad Width, or Auto-Lube System.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {customSpecs.map((spec, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1.2fr auto',
                      gap: '0.5rem',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      aria-label={`Custom detail name ${idx + 1}`}
                      placeholder="Detail Name (e.g. Track Width)"
                      value={spec.label}
                      onChange={(e) => handleSpecChange(idx, 'label', e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <input
                      type="text"
                      aria-label={`Custom detail value ${idx + 1}`}
                      placeholder="Value (e.g. 800 mm)"
                      value={spec.value}
                      onChange={(e) => handleSpecChange(idx, 'value', e.target.value)}
                      style={{ margin: 0 }}
                    />
                    <button
                      type="button"
                      className="btn"
                      aria-label={`Remove custom detail ${idx + 1}`}
                      onClick={() => handleRemoveSpecRow(idx)}
                      style={{
                        padding: '0.45rem 0.7rem',
                        color: '#fb7185',
                        borderColor: 'rgba(244, 63, 94, 0.3)',
                        background: 'rgba(244, 63, 94, 0.08)',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.25rem' }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={handleDelete}
              style={{ backgroundColor: 'rgba(244, 63, 94, 0.16)', color: '#fb7185', borderColor: 'rgba(244, 63, 94, 0.4)' }}
              disabled={loading}
            >
              Delete
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
