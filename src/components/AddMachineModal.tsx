"use client"

import { useState } from 'react'
import Modal from './Modal'
import EquipmentIcon from './EquipmentIcon'
import { useRouter } from 'next/navigation'

export default function AddMachineModal({
  defaultCategory = 'Shovel',
  buttonLabel,
}: {
  defaultCategory?: 'Shovel' | 'Drill'
  buttonLabel?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [category, setCategory] = useState<'Shovel' | 'Drill'>(defaultCategory)
  const [make, setMake] = useState(defaultCategory === 'Shovel' ? 'BEML' : 'Sandvik')
  const [capacity, setCapacity] = useState(defaultCategory === 'Shovel' ? '6.5 Cu.M' : '150mm')
  const router = useRouter()

  const handleCategoryChange = (newCat: 'Shovel' | 'Drill') => {
    setCategory(newCat)
    if (newCat === 'Shovel') {
      setMake('BEML')
      setCapacity('6.5 Cu.M')
    } else {
      setMake('Sandvik')
      setCapacity('150mm')
    }
  }

  const handleOpen = () => {
    handleCategoryChange(defaultCategory)
    setError('')
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(e.currentTarget)
    
    const res = await fetch(`/api/machines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        category,
        make: formData.get('make'),
        capacity: formData.get('capacity'),
        model: formData.get('model'),
        type: category === 'Shovel' ? 'Hydraulic Shovel' : 'RBH 150mm drill',
        status: formData.get('status') || 'Working',
        runningHours: parseFloat(formData.get('runningHours') as string) || 0,
        serialNumber: formData.get('serialNumber') || null,
        commissioningDate: formData.get('commissioningDate') ? new Date(formData.get('commissioningDate') as string).toISOString() : null,
      })
    })

    if (res.ok) {
      setIsOpen(false)
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to add equipment')
    }
    setLoading(false)
  }

  return (
    <>
      <button className="btn btn-primary" onClick={handleOpen}>
        {buttonLabel ?? `+ Add ${category}`}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`Add New ${category}`}>
        {error && <div className="badge danger mb-4" style={{ display: 'block' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Equipment Category Selection Tabs */}
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Equipment Category</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button
                type="button"
                className={`btn ${category === 'Shovel' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCategoryChange('Shovel')}
                style={{ padding: '0.6rem' }}
              >
                <EquipmentIcon category="Shovel" size={16} />
                <span>Shovel</span>
              </button>
              <button
                type="button"
                className={`btn ${category === 'Drill' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCategoryChange('Drill')}
                style={{ padding: '0.6rem' }}
              >
                <EquipmentIcon category="Drill" size={16} />
                <span>Drill</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Equipment Unit ID</label>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder={category === 'Shovel' ? "e.g. B4, T7, S4" : "e.g. DM17, DM18"} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Make / Manufacturer</label>
              <input 
                type="text" 
                name="make" 
                value={make}
                onChange={(e) => setMake(e.target.value)}
                required
                placeholder={category === 'Shovel' ? "e.g. BEML, Tata Hitachi, Komatsu" : "e.g. Sandvik, Atlas Copco"} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Model</label>
              <input 
                type="text" 
                name="model" 
                required 
                placeholder={category === 'Shovel' ? "e.g. BE-1000, EX1200, PC450" : "e.g. IDM30, REL650"} 
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {category === 'Shovel' ? 'Bucket Capacity' : 'Drilling Capacity'}
              </label>
              <input 
                type="text" 
                name="capacity" 
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                placeholder={category === 'Shovel' ? "e.g. 6.5 Cu.M, 5.0 Cu.M" : "e.g. 150mm"} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Current Machine HMR</label>
              <input type="number" step="0.1" name="runningHours" required defaultValue={0} />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Operational Status</label>
              <select name="status" required defaultValue="Working">
                <option value="Working">Working</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Breakdown">Breakdown</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Serial Number (Optional)</label>
              <input type="text" name="serialNumber" placeholder="e.g. S/N 123456" />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Commissioning Date</label>
              <input type="date" name="commissioningDate" />
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {category === 'Shovel' ? (
              <span>ℹ️ Shovels will automatically be configured with <strong>Engine (250h)</strong> and <strong>Hydraulic (1000h)</strong> maintenance schedules. <em>(No compressor schedule)</em></span>
            ) : (
              <span>ℹ️ Drills will automatically be configured with <strong>Engine (250h)</strong>, <strong>Compressor (500h)</strong>, and <strong>Hydraulic (1000h)</strong> schedules.</span>
            )}
          </div>
          
          <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', padding: '0.75rem' }} disabled={loading}>
            {loading ? 'Registering...' : `Add New ${category}`}
          </button>
        </form>
      </Modal>
    </>
  )
}
