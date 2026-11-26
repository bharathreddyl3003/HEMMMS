import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { deductSparePartsInTx } from '@/lib/spares'

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
    
    // If not created yet, create category-specific defaults
    if (schedules.length === 0) {
      const machine = await prisma.machine.findUnique({
        where: { id: resolvedParams.id },
        select: { category: true, runningHours: true }
      })

      const isShovel = machine?.category === 'Shovel'
      const initialHmr = machine?.runningHours || 0

      const defaultData = isShovel ? [
        { machineId: resolvedParams.id, type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: initialHmr },
        { machineId: resolvedParams.id, type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: initialHmr },
      ] : [
        { machineId: resolvedParams.id, type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: initialHmr },
        { machineId: resolvedParams.id, type: 'Compressor', intervalHrs: 500, lastMaintenanceHmr: initialHmr },
        { machineId: resolvedParams.id, type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: initialHmr },
      ]

      await prisma.scheduledMaintenance.createMany({
        data: defaultData
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
      deductedParts,
      timeSpentHrs,
      cost,
      description
    } = await request.json()

    const allowedTypes = ['Engine', 'Compressor', 'Hydraulic']
    if (typeof type !== 'string' || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid maintenance schedule type' }, { status: 400 })
    }

    const parsedHmr = parseFloat(lastMaintenanceHmr)
    if (!Number.isFinite(parsedHmr) || parsedHmr < 0) {
      return NextResponse.json({ error: 'Valid non-negative maintenance HMR is required' }, { status: 400 })
    }

    const parsedDate = lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date()
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid maintenance date' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const { formattedPartsUsed, lowStockAlerts } = await deductSparePartsInTx(
        tx,
        deductedParts,
        partsUsed
      )

      const schedule = await tx.scheduledMaintenance.update({
        where: {
          machineId_type: {
            machineId: resolvedParams.id,
            type
          }
        },
        data: {
          lastMaintenanceDate: parsedDate,
          lastMaintenanceHmr: parsedHmr
        }
      })

      // Update machine running hours if maintenance HMR is higher
      const machine = await tx.machine.findUnique({
        where: { id: resolvedParams.id }
      })
      if (machine && parsedHmr > machine.runningHours) {
        await tx.machine.update({
          where: { id: resolvedParams.id },
          data: { runningHours: parsedHmr }
        })
      }

      await tx.maintenanceRecord.create({
        data: {
          machineId: resolvedParams.id,
          description: description || `Completed Scheduled Maintenance: ${type} Side`,
          logType: 'Scheduled Maintenance',
          subassemblyName: type,
          hmr: parsedHmr,
          status: 'Completed',
          performedBy: performedBy || null,
          partsUsed: formattedPartsUsed,
          timeSpentHrs: timeSpentHrs ? parseFloat(timeSpentHrs) : null,
          cost: cost ? parseFloat(cost) : null
        }
      })

      return { schedule, lowStockAlerts }
    })
    
    return NextResponse.json({
      ...updated.schedule,
      lowStockAlerts: updated.lowStockAlerts
    })
  } catch (error: any) {
    console.error('Scheduled Maintenance PATCH Error:', error)
    const msg = error?.message || 'Failed to update'
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Scheduled maintenance record not found' }, { status: 404 })
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
