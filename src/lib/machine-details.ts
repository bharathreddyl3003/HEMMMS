import { Prisma } from '@prisma/client'

export interface CustomSpecEntry {
  label: string
  value: string
}

export class MachineDetailValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MachineDetailValidationError'
  }
}

export function sanitizeOptionalText(value: unknown, fieldName: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new MachineDetailValidationError(`${fieldName} must be text`)
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function parseManufactureYear(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null

  const numeric = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isInteger(numeric) || numeric < 1950 || numeric > 2100) {
    throw new MachineDetailValidationError('Manufacture year must be an integer between 1950 and 2100')
  }
  return numeric
}

export function sanitizeCustomSpecs(value: unknown): CustomSpecEntry[] | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!Array.isArray(value)) {
    throw new MachineDetailValidationError('Custom details must be an array')
  }

  if (value.length > 30) {
    throw new MachineDetailValidationError('A maximum of 30 custom details is supported per machine')
  }

  const cleaned: CustomSpecEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      throw new MachineDetailValidationError('Each custom detail must include label and value fields')
    }
    const rawLabel = (item as Record<string, unknown>).label
    const rawValue = (item as Record<string, unknown>).value
    const label = typeof rawLabel === 'string' ? rawLabel.trim() : ''
    const val = typeof rawValue === 'string' ? rawValue.trim() : ''

    if (!label && !val) continue
    if (!label || !val) {
      throw new MachineDetailValidationError('Each custom detail must include both a detail name and value')
    }
    cleaned.push({ label: label.slice(0, 100), value: val.slice(0, 300) })
  }

  return cleaned.length > 0 ? cleaned : null
}

export function extractCustomSpecs(raw: unknown): CustomSpecEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .map((entry) => ({
      label: typeof entry.label === 'string' ? entry.label.trim() : '',
      value: typeof entry.value === 'string' ? entry.value.trim() : '',
    }))
    .filter((entry) => entry.label.length > 0 && entry.value.length > 0)
}

/**
 * Parses and validates optional extended machine detail fields for create/update APIs.
 * Unspecified (`undefined`) fields are omitted so partial PATCH requests do not clear existing data.
 */
export function parseExtendedMachineFields(data: Record<string, unknown>) {
  const customSpecsRaw = sanitizeCustomSpecs(data.customSpecs)
  const customSpecs =
    customSpecsRaw === undefined
      ? undefined
      : customSpecsRaw === null
      ? Prisma.JsonNull
      : (customSpecsRaw as unknown as Prisma.InputJsonValue)

  return {
    assetCode: sanitizeOptionalText(data.assetCode, 'Asset code'),
    manufactureYear: parseManufactureYear(data.manufactureYear),
    deploymentLocation: sanitizeOptionalText(data.deploymentLocation, 'Deployment location'),
    supervisorName: sanitizeOptionalText(data.supervisorName, 'Supervisor name'),
    powerSource: sanitizeOptionalText(data.powerSource, 'Power source'),
    engineDetails: sanitizeOptionalText(data.engineDetails, 'Engine details'),
    operatingWeight: sanitizeOptionalText(data.operatingWeight, 'Operating weight'),
    fluidCapacities: sanitizeOptionalText(data.fluidCapacities, 'Fluid capacities'),
    notes: sanitizeOptionalText(data.notes, 'Equipment notes'),
    customSpecs,
  }
}
