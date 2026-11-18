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

    const newMachine = await prisma.machine.create({
      data: {
        name: data.name,
        model: data.model,
        type: data.type,
        status: data.status,
        runningHours: data.runningHours,
        serialNumber: data.serialNumber || null,
        commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : null,
      },
      include: { subassemblies: true }
    })

    return NextResponse.json(newMachine)
  } catch (error: any) {
    console.error('POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create machine' }, { status: 500 })
  }
}
