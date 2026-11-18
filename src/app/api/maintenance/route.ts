import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
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
    } = await request.json()

    const result = await prisma.$transaction(async (tx) => {
      const parsedHmr = hmr !== null && hmr !== undefined && hmr !== '' ? parseFloat(hmr) : null

      const log = await tx.maintenanceRecord.create({
        data: {
          machineId,
          description,
          logType: logType || 'Routine',
          hmr: parsedHmr,
          dueDate: dueDate ? new Date(dueDate) : null,
          status: status || 'Completed',
          performedBy: performedBy || null,
          partsUsed: partsUsed || null,
          timeSpentHrs: timeSpentHrs ? parseFloat(timeSpentHrs) : null,
          cost: cost ? parseFloat(cost) : null,
          subassemblyName: subassemblyName || null
        },
        include: {
          machine: true
        }
      })

      // If HMR is provided and higher than machine's current running hours, update machine
      if (parsedHmr !== null) {
        const machine = await tx.machine.findUnique({ where: { id: machineId } })
        if (machine && parsedHmr > machine.runningHours) {
          await tx.machine.update({
            where: { id: machineId },
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
              machineId,
              type: scheduleType
            }
          },
          update: {
            lastMaintenanceHmr: parsedHmr,
            lastMaintenanceDate: new Date()
          },
          create: {
            machineId,
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
