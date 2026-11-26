import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { MachineDetailValidationError, parseExtendedMachineFields } from '@/lib/machine-details'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const machines = await prisma.machine.findMany({
      include: {
        subassemblies: true,
      },
      orderBy: {
        name: 'asc'
      }
    })
    return NextResponse.json(machines)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch machines' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditMachines)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await request.json()

    if (typeof data?.name !== 'string' || !data.name.trim() || typeof data?.model !== 'string' || !data.model.trim()) {
      return NextResponse.json({ error: 'Name and model are required' }, { status: 400 })
    }

    const category = data.category === 'Shovel' ? 'Shovel' : 'Drill'
    const initialHmr = data.runningHours !== undefined && data.runningHours !== null && data.runningHours !== ''
      ? parseFloat(data.runningHours)
      : 0

    if (!Number.isFinite(initialHmr) || initialHmr < 0) {
      return NextResponse.json({ error: 'Invalid running hours value' }, { status: 400 })
    }

    let commissioningDate: Date | null = null
    if (data.commissioningDate) {
      const parsed = new Date(data.commissioningDate)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Invalid commissioning date' }, { status: 400 })
      }
      commissioningDate = parsed
    }

    const subassemblyData = category === 'Shovel' ? [
      { name: 'Engine / Prime Mover', lifeExpectancyHours: 10000, currentHours: 0, healthStatus: 'Good' },
      { name: 'Hydraulic System & Pumps', lifeExpectancyHours: 6000, currentHours: 0, healthStatus: 'Good' },
      { name: 'Swing Device & Machinery', lifeExpectancyHours: 8000, currentHours: 0, healthStatus: 'Good' },
      { name: `Attachment (Boom, Arm, ${data.capacity || 'Bucket'})`, lifeExpectancyHours: 7000, currentHours: 0, healthStatus: 'Good' },
      { name: 'Undercarriage & Tracks', lifeExpectancyHours: 5000, currentHours: 0, healthStatus: 'Good' },
    ] : [
      { name: 'Engine', lifeExpectancyHours: 10000, currentHours: 0, healthStatus: 'Good' },
      { name: 'Compressor', lifeExpectancyHours: 8000, currentHours: 0, healthStatus: 'Good' },
      { name: 'Hydraulic Pump', lifeExpectancyHours: 5000, currentHours: 0, healthStatus: 'Good' },
      { name: 'Rotary Head', lifeExpectancyHours: 6000, currentHours: 0, healthStatus: 'Good' },
    ]

    const scheduledData = category === 'Shovel' ? [
      { type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: initialHmr },
      { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: initialHmr },
    ] : [
      { type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: initialHmr },
      { type: 'Compressor', intervalHrs: 500, lastMaintenanceHmr: initialHmr },
      { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: initialHmr },
    ]

    const extendedFields = parseExtendedMachineFields(data || {})

    const newMachine = await prisma.machine.create({
      data: {
        name: data.name.trim(),
        model: data.model.trim(),
        category,
        make: data.make || null,
        capacity: data.capacity || null,
        type: data.type || (category === 'Shovel' ? 'Hydraulic Shovel' : 'RBH 150mm drill'),
        status: data.status || 'Working',
        runningHours: initialHmr,
        serialNumber: data.serialNumber || null,
        commissioningDate,
        ...extendedFields,
        subassemblies: {
          create: subassemblyData
        },
        scheduledMaintenances: {
          create: scheduledData
        }
      },
      include: {
        subassemblies: true,
        scheduledMaintenances: true
      }
    })

    return NextResponse.json(newMachine)
  } catch (error: unknown) {
    if (error instanceof MachineDetailValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const err = error as { message?: string }
    console.error('POST Error:', error)
    return NextResponse.json({ error: err?.message || 'Failed to create machine' }, { status: 500 })
  }
}
