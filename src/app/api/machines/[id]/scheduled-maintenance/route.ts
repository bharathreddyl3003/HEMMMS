import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canManageScheduledMaintenance)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const schedules = await prisma.scheduledMaintenance.findMany({
      where: { machineId: resolvedParams.id }
    })
    
    // If not created yet, create the defaults
    if (schedules.length === 0) {
      await prisma.scheduledMaintenance.createMany({
        data: [
          { machineId: resolvedParams.id, type: 'Engine', intervalHrs: 250 },
          { machineId: resolvedParams.id, type: 'Compressor', intervalHrs: 500 },
          { machineId: resolvedParams.id, type: 'Hydraulic', intervalHrs: 1000 },
        ]
      })
      const newSchedules = await prisma.scheduledMaintenance.findMany({
        where: { machineId: resolvedParams.id }
      })
      return NextResponse.json(newSchedules)
    }

    return NextResponse.json(schedules)
  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canManageScheduledMaintenance)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const { 
      type, 
      lastMaintenanceDate, 
      lastMaintenanceHmr,
      performedBy,
      partsUsed,
      timeSpentHrs,
      cost,
      description
    } = await request.json()

    const updated = await prisma.$transaction(async (tx) => {
      const schedule = await tx.scheduledMaintenance.update({
        where: {
          machineId_type: {
            machineId: resolvedParams.id,
            type
          }
        },
        data: {
          lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date(),
          lastMaintenanceHmr: parseFloat(lastMaintenanceHmr)
        }
      })

      // Update machine running hours if maintenance HMR is higher
      const machine = await tx.machine.findUnique({
        where: { id: resolvedParams.id }
      })
      if (machine && parseFloat(lastMaintenanceHmr) > machine.runningHours) {
        await tx.machine.update({
          where: { id: resolvedParams.id },
          data: { runningHours: parseFloat(lastMaintenanceHmr) }
        })
      }

      await tx.maintenanceRecord.create({
        data: {
          machineId: resolvedParams.id,
          description: description || `Completed Scheduled Maintenance: ${type} Side`,
          logType: 'Scheduled Maintenance',
          subassemblyName: type,
          hmr: parseFloat(lastMaintenanceHmr),
          status: 'Completed',
          performedBy: performedBy || null,
          partsUsed: partsUsed || null,
          timeSpentHrs: timeSpentHrs ? parseFloat(timeSpentHrs) : null,
          cost: cost ? parseFloat(cost) : null
        }
      })

      return schedule
    })
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Scheduled Maintenance PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 })
  }
}
