import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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
    const body = await request.json()
    const { name, lifeExpectancyHours, currentHours, healthStatus } = body || {}

    const updateData: Record<string, any> = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (lifeExpectancyHours !== undefined) {
      const lifeExp = Number(lifeExpectancyHours)
      if (!Number.isFinite(lifeExp) || lifeExp <= 0) {
        return NextResponse.json({ error: 'Life expectancy must be positive' }, { status: 400 })
      }
      updateData.lifeExpectancyHours = lifeExp
    }
    if (currentHours !== undefined) {
      const currHrs = Number(currentHours)
      if (!Number.isFinite(currHrs) || currHrs < 0) {
        return NextResponse.json({ error: 'Current hours must be non-negative' }, { status: 400 })
      }
      updateData.currentHours = currHrs
    }
    if (healthStatus !== undefined) {
      updateData.healthStatus = healthStatus
    }

    const subassembly = await prisma.subassembly.update({
      where: { id: resolvedParams.id },
      data: updateData
    })
    return NextResponse.json(subassembly)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Subassembly not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update subassembly' }, { status: 500 })
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
    await prisma.subassembly.delete({
      where: { id: resolvedParams.id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Subassembly not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete subassembly' }, { status: 500 })
  }
}
