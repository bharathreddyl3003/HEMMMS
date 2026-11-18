import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditMachines)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { machineId, name, lifeExpectancyHours, currentHours, healthStatus } = await request.json()

    if (!machineId || !name || !lifeExpectancyHours) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const newSubassembly = await prisma.subassembly.create({
      data: {
        machineId,
        name,
        lifeExpectancyHours: Number(lifeExpectancyHours),
        currentHours: Number(currentHours) || 0,
        healthStatus: healthStatus || 'Good'
      }
    })

    return NextResponse.json(newSubassembly)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add subassembly' }, { status: 500 })
  }
}
