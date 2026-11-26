import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditMachines)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { machineId, name, lifeExpectancyHours, currentHours, healthStatus } = body || {}

    if (typeof machineId !== 'string' || !machineId.trim() || typeof name !== 'string' || !name.trim() || lifeExpectancyHours === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const lifeExp = Number(lifeExpectancyHours)
    const currHrs = currentHours !== undefined && currentHours !== '' ? Number(currentHours) : 0

    if (!Number.isFinite(lifeExp) || lifeExp <= 0 || !Number.isFinite(currHrs) || currHrs < 0) {
      return NextResponse.json({ error: 'Invalid hours values' }, { status: 400 })
    }

    const newSubassembly = await prisma.subassembly.create({
      data: {
        machineId: machineId.trim(),
        name: name.trim(),
        lifeExpectancyHours: lifeExp,
        currentHours: currHrs,
        healthStatus: healthStatus || 'Good'
      }
    })

    return NextResponse.json(newSubassembly)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add subassembly' }, { status: 500 })
  }
}
