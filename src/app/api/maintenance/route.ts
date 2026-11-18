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

    const body = await request.json()
    const log = await prisma.maintenanceRecord.create({
      data: body,
      include: {
        machine: true
      }
    })
    return NextResponse.json(log, { status: 201 })
  } catch (error: any) {
    console.error('Maintenance POST Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create maintenance log' }, { status: 500 })
  }
}
