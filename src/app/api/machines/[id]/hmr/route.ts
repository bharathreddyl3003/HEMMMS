import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.role !== 'ADMIN' && !session.permissions?.canEditMachines) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const runningHours = typeof body?.runningHours === 'number'
      ? body.runningHours
      : parseFloat(body?.runningHours)

    if (!Number.isFinite(runningHours) || runningHours < 0) {
      return NextResponse.json({ error: 'Invalid running hours value' }, { status: 400 })
    }

    const updated = await prisma.machine.update({
      where: { id: resolvedParams.id },
      data: { runningHours }
    })

    return NextResponse.json({
      success: true,
      id: updated.id,
      name: updated.name,
      runningHours: updated.runningHours
    })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }
    console.error('HMR Auto-save Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update HMR' }, { status: 500 })
  }
}
