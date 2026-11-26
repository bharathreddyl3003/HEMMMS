import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { MachineDetailValidationError, parseExtendedMachineFields } from '@/lib/machine-details'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const machine = await prisma.machine.findUnique({
      where: { id: resolvedParams.id },
      include: { subassemblies: true }
    })
    if (!machine) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(machine)
  } catch {
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

    let runningHours: number | undefined
    if (data.runningHours !== undefined) {
      runningHours = parseFloat(data.runningHours)
      if (!Number.isFinite(runningHours) || runningHours < 0) {
        return NextResponse.json({ error: 'Invalid running hours value' }, { status: 400 })
      }
    }

    let commissioningDate: Date | null | undefined
    if (data.commissioningDate !== undefined) {
      if (!data.commissioningDate) {
        commissioningDate = null
      } else {
        const parsed = new Date(data.commissioningDate)
        if (isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'Invalid commissioning date' }, { status: 400 })
        }
        commissioningDate = parsed
      }
    }

    const extendedFields = parseExtendedMachineFields(data || {})

    const updated = await prisma.machine.update({
      where: { id: resolvedParams.id },
      data: {
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : data.name,
        model: typeof data.model === 'string' && data.model.trim() ? data.model.trim() : data.model,
        category: data.category !== undefined ? data.category : undefined,
        make: data.make !== undefined ? (data.make || null) : undefined,
        capacity: data.capacity !== undefined ? (data.capacity || null) : undefined,
        type: data.type,
        status: data.status,
        runningHours,
        serialNumber: data.serialNumber !== undefined ? (data.serialNumber || null) : undefined,
        commissioningDate,
        ...extendedFields,
      }
    })
    return NextResponse.json(updated)
  } catch (error: unknown) {
    if (error instanceof MachineDetailValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const prismaError = error as { code?: string; message?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }
    console.error('PATCH Error:', error)
    return NextResponse.json({ error: prismaError?.message || 'Failed to update' }, { status: 500 })
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
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete machine' }, { status: 500 })
  }
}
