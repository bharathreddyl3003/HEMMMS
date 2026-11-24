import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
      partsUsed
    } = body

    if (!fitterName || fitterName.trim() === '') {
      return NextResponse.json({ error: 'Fitter name is required' }, { status: 400 })
    }

    const hmrValue = parseFloat(serviceHmr)
    if (isNaN(hmrValue)) {
      return NextResponse.json({ error: 'Valid service HMR is required' }, { status: 400 })
    }

    const intervalValue = parseInt(interval) || 250
    const completionDate = date ? new Date(date) : new Date()

    // 1. Check machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    })

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    // 2. Upsert ScheduledMaintenance for this machine and type
    const scheduledMaintenance = await prisma.scheduledMaintenance.upsert({
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

    // 3. Update machine runningHours if serviceHmr is higher
    const updatedMachine = await prisma.machine.update({
      where: { id: machineId },
      data: {
        runningHours: Math.max(machine.runningHours, hmrValue),
        status: 'Working'
      }
    })

    // 4. Create completed MaintenanceRecord
    const record = await prisma.maintenanceRecord.create({
      data: {
        machineId,
        description: description || `${type} Scheduled Maintenance (${intervalValue}h)`,
        logType: 'Scheduled Maintenance',
        hmr: hmrValue,
        status: 'Completed',
        performedBy: fitterName.trim(),
        partsUsed: partsUsed || null,
        createdAt: completionDate
      }
    })

    return NextResponse.json({
      success: true,
      machine: updatedMachine,
      scheduledMaintenance,
      record
    })
  } catch (error: any) {
    console.error('Service Completion Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to complete service' }, { status: 500 })
  }
}
