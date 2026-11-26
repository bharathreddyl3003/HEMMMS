import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const logs = await prisma.maintenanceRecord.findMany({
      include: {
        machine: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(logs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch maintenance logs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canManageMaintenance)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      machineId,
      description,
      logType,
      hmr,
      dueDate,
      status,
      performedBy,
      partsUsed,
      timeSpentHrs,
      cost,
      subassemblyName,
      resetSchedule
    } = body || {}

    if (typeof machineId !== 'string' || !machineId.trim() || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Machine ID and description are required' }, { status: 400 })
    }

    const parsedHmr = hmr !== null && hmr !== undefined && hmr !== '' ? parseFloat(hmr) : null
    if (parsedHmr !== null && (!Number.isFinite(parsedHmr) || parsedHmr < 0)) {
      return NextResponse.json({ error: 'Invalid HMR value' }, { status: 400 })
    }

    const parsedTime = timeSpentHrs !== null && timeSpentHrs !== undefined && timeSpentHrs !== '' ? parseFloat(timeSpentHrs) : null
    if (parsedTime !== null && (!Number.isFinite(parsedTime) || parsedTime < 0)) {
      return NextResponse.json({ error: 'Invalid labor hours value' }, { status: 400 })
    }

    const parsedCost = cost !== null && cost !== undefined && cost !== '' ? parseFloat(cost) : null
    if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) {
      return NextResponse.json({ error: 'Invalid cost value' }, { status: 400 })
    }

    let parsedDueDate: Date | null = null
    if (dueDate) {
      const d = new Date(dueDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid due date' }, { status: 400 })
      }
      parsedDueDate = d
    }

    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceRecord.create({
        data: {
          machineId: machineId.trim(),
          description: description.trim(),
          logType: logType || 'Routine',
          hmr: parsedHmr,
          dueDate: parsedDueDate,
          status: status || 'Completed',
          performedBy: performedBy || null,
          partsUsed: partsUsed || null,
          timeSpentHrs: parsedTime,
          cost: parsedCost,
          subassemblyName: subassemblyName || null
        },
        include: {
          machine: true
        }
      })

      // If HMR is provided and higher than machine's current running hours, update machine
      if (parsedHmr !== null) {
        const machine = await tx.machine.findUnique({ where: { id: machineId.trim() } })
        if (machine && parsedHmr > machine.runningHours) {
          await tx.machine.update({
            where: { id: machineId.trim() },
            data: { runningHours: parsedHmr }
          })
        }
      }

      // If this is a Scheduled Maintenance completion (or resetSchedule is checked)
      const scheduleType = subassemblyName || (logType === 'Scheduled Maintenance' ? 'Engine' : null)
      if (resetSchedule && scheduleType && parsedHmr !== null) {
        await tx.scheduledMaintenance.upsert({
          where: {
            machineId_type: {
              machineId: machineId.trim(),
              type: scheduleType
            }
          },
          update: {
            lastMaintenanceHmr: parsedHmr,
            lastMaintenanceDate: new Date()
          },
          create: {
            machineId: machineId.trim(),
            type: scheduleType,
            intervalHrs: scheduleType === 'Engine' ? 250 : scheduleType === 'Compressor' ? 500 : 1000,
            lastMaintenanceHmr: parsedHmr,
            lastMaintenanceDate: new Date()
          }
        })
      }

      return log
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    console.error('Maintenance POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create maintenance log' }, { status: 500 })
  }
}
