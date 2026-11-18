import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const machines = await prisma.machine.findMany({
      include: {
        subassemblies: true,
      },
      orderBy: {
        name: 'asc'
      }
    })
    return NextResponse.json(machines)
  } catch (error) {
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

    if (!data.name || !data.model) {
      return NextResponse.json({ error: 'Name and model are required' }, { status: 400 })
    }

    const category = data.category === 'Shovel' ? 'Shovel' : 'Drill'
    const initialHmr = parseFloat(data.runningHours || 0)

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

    const newMachine = await prisma.machine.create({
      data: {
        name: data.name,
        model: data.model,
        category,
        make: data.make || null,
        capacity: data.capacity || null,
        type: data.type || (category === 'Shovel' ? 'Hydraulic Shovel' : 'RBH 150mm drill'),
        status: data.status || 'Working',
        runningHours: initialHmr,
        serialNumber: data.serialNumber || null,
        commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : null,
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
  } catch (error: any) {
    console.error('POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create machine' }, { status: 500 })
  }
}
