import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import {
  MachineDetailValidationError,
  sanitizeOptionalText,
  parseManufactureYear,
  sanitizeCustomSpecs,
  extractCustomSpecs,
  parseExtendedMachineFields,
} from '@/lib/machine-details'

describe('machine-details validation & sanitization helpers', () => {
  it('normalizes optional strings cleanly and rejects non-string inputs', () => {
    expect(sanitizeOptionalText(undefined, 'Field')).toBeUndefined()
    expect(sanitizeOptionalText(null, 'Field')).toBeNull()
    expect(sanitizeOptionalText('   ', 'Field')).toBeNull()
    expect(sanitizeOptionalText('  OB Bench 4  ', 'Field')).toBe('OB Bench 4')
    expect(() => sanitizeOptionalText(42, 'Field')).toThrow(MachineDetailValidationError)
  })

  it('validates manufactureYear bounds cleanly', () => {
    expect(parseManufactureYear(undefined)).toBeUndefined()
    expect(parseManufactureYear('')).toBeNull()
    expect(parseManufactureYear(null)).toBeNull()
    expect(parseManufactureYear('2021')).toBe(2021)
    expect(parseManufactureYear(2024)).toBe(2024)
    expect(() => parseManufactureYear(1899)).toThrow(MachineDetailValidationError)
    expect(() => parseManufactureYear(2021.5)).toThrow(MachineDetailValidationError)
  })

  it('sanitizes customSpecs arrays, omits blank rows, and rejects half-filled rows', () => {
    expect(sanitizeCustomSpecs(undefined)).toBeUndefined()
    expect(sanitizeCustomSpecs([])).toBeNull()
    expect(
      sanitizeCustomSpecs([
        { label: ' Track Width ', value: ' 800mm ' },
        { label: '', value: '' },
      ])
    ).toEqual([{ label: 'Track Width', value: '800mm' }])

    expect(() => sanitizeCustomSpecs('bad')).toThrow(MachineDetailValidationError)
    expect(() => sanitizeCustomSpecs([{ label: 'Track Width', value: '' }])).toThrow(MachineDetailValidationError)
    expect(() => sanitizeCustomSpecs([{ label: '', value: '800mm' }])).toThrow(MachineDetailValidationError)
    expect(() =>
      sanitizeCustomSpecs(Array.from({ length: 31 }, (_, i) => ({ label: `L${i}`, value: `V${i}` })))
    ).toThrow(MachineDetailValidationError)
  })

  it('extractCustomSpecs safely ignores malformed data and parseExtendedMachineFields sets JsonNull', () => {
    expect(extractCustomSpecs(null)).toEqual([])
    expect(extractCustomSpecs([{ label: 'Mast', value: '12m' }, { bad: true }])).toEqual([
      { label: 'Mast', value: '12m' },
    ])

    const parsed = parseExtendedMachineFields({
      assetCode: ' RG2-SH-01 ',
      manufactureYear: 2022,
      deploymentLocation: 'Bench 3',
      supervisorName: 'R. Kumar',
      powerSource: 'Diesel',
      engineDetails: 'Cummins QSK23',
      operatingWeight: '118 Ton',
      fluidCapacities: 'Fuel 1400L',
      notes: 'Undercarriage checked',
      customSpecs: [],
    })

    expect(parsed.assetCode).toBe('RG2-SH-01')
    expect(parsed.manufactureYear).toBe(2022)
    expect(parsed.customSpecs).toBe(Prisma.JsonNull)
  })
})
