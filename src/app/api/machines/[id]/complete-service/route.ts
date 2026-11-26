import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { deductSparePartsInTx, DeductedPartInput } from '@/lib/spares'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (
      session.role !== 'ADMIN' &&
      !session.permissions?.canEditMachines &&
      !session.permissions?.canManageScheduledMaintenance
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const machineId = resolvedParams.id
    const body = await request.json()

    const {
      fitterName,
      serviceHmr,
      interval,
      type = 'Engine',
      description,
      date,
      partsUsed,
      deductedParts
    } = body as {
      fitterName?: string
      serviceHmr?: number | string
      interval?: number | string
      type?: string
      description?: string
      date?: string
      partsUsed?: string
      deductedParts?: DeductedPartInput[]
    }

    if (typeof fitterName !== 'string' || fitterName.trim() === '') {
      return NextResponse.json({ error: 'Fitter name is required' }, { status: 400 })
    }

    const hmrValue = parseFloat(String(serviceHmr))
    if (!Number.isFinite(hmrValue) || hmrValue < 0) {
      return NextResponse.json({ error: 'Valid non-negative service HMR is required' }, { status: 400 })
    }

    let intervalValue = 250
    if (interval !== undefined && interval !== null && interval !== '') {
      const parsedInterval = parseInt(String(interval), 10)
      if (!Number.isFinite(parsedInterval) || parsedInterval <= 0) {
        return NextResponse.json({ error: 'Interval must be a positive number of hours' }, { status: 400 })
      }
      intervalValue = parsedInterval
    }

    const completionDate = date ? new Date(date) : new Date()
    if (isNaN(completionDate.getTime())) {
      return NextResponse.json({ error: 'Invalid completion date' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check machine exists
      const machine = await tx.machine.findUnique({
        where: { id: machineId }
      })

      if (!machine) {
        throw new Error('NOT_FOUND:Machine not found')
      }

      // 2. Deduct selected spare parts atomically
      const { formattedPartsUsed, lowStockAlerts } = await deductSparePartsInTx(
        tx,
        deductedParts,
        partsUsed
      )

      // 3. Upsert ScheduledMaintenance for this machine and type
      const scheduledMaintenance = await tx.scheduledMaintenance.upsert({
        where: {
          machineId_type: {
            machineId,
            type
          }
        },
        update: {
          lastMaintenanceHmr: hmrValue,
          lastMaintenanceDate: completionDate,
          intervalHrs: intervalValue
        },
        create: {
          machineId,
          type,
          lastMaintenanceHmr: hmrValue,
          lastMaintenanceDate: completionDate,
          intervalHrs: intervalValue
        }
      })

      // 4. Update machine runningHours if serviceHmr is higher
      const updatedMachine = await tx.machine.update({
        where: { id: machineId },
        data: {
          runningHours: Math.max(machine.runningHours, hmrValue),
          status: 'Working'
        }
      })

      // 5. Create completed MaintenanceRecord
      const record = await tx.maintenanceRecord.create({
        data: {
          machineId,
          description: description || `${type} Scheduled Maintenance (${intervalValue}h)`,
          logType: 'Scheduled Maintenance',
          subassemblyName: type,
          hmr: hmrValue,
          status: 'Completed',
          performedBy: fitterName.trim(),
          partsUsed: formattedPartsUsed,
          createdAt: completionDate
        }
      })

      return {
        updatedMachine,
        scheduledMaintenance,
        record,
        lowStockAlerts
      }
    })

    return NextResponse.json({
      success: true,
      machine: result.updatedMachine,
      scheduledMaintenance: result.scheduledMaintenance,
      record: result.record,
      lowStockAlerts: result.lowStockAlerts
    })
  } catch (error: any) {
    console.error('Service Completion Error:', error)
    const msg = error?.message || 'Failed to complete service'
    if (msg.startsWith('NOT_FOUND:')) {
      return NextResponse.json({ error: msg.replace('NOT_FOUND:', '') }, { status: 404 })
    }
    if (
      msg.startsWith('Insufficient stock') ||
      msg.startsWith('Spare part not found') ||
      msg.startsWith('Invalid spare part')
    ) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
