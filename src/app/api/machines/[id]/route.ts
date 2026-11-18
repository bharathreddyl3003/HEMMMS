import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const machine = await prisma.machine.findUnique({
      where: { id: resolvedParams.id },
      include: { subassemblies: true }
    })
    if (!machine) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(machine)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditMachines)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const data = await request.json()

    const updated = await prisma.machine.update({
      where: { id: resolvedParams.id },
      data: {
        name: data.name,
        model: data.model,
        category: data.category !== undefined ? data.category : undefined,
        make: data.make !== undefined ? data.make : undefined,
        capacity: data.capacity !== undefined ? data.capacity : undefined,
        type: data.type,
        status: data.status,
        runningHours: data.runningHours !== undefined ? parseFloat(data.runningHours) : undefined,
        serialNumber: data.serialNumber || null,
        commissioningDate: data.commissioningDate ? new Date(data.commissioningDate) : null,
      }
    })
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditMachines)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    await prisma.machine.delete({
      where: { id: resolvedParams.id }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 })
  }
}
