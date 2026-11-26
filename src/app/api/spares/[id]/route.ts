import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditSpares)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { adjustment, stockQuantity, reorderLevel } = body || {}

    if (adjustment === undefined && stockQuantity === undefined && reorderLevel === undefined) {
      return NextResponse.json({ error: 'Provide adjustment, stockQuantity, or reorderLevel to update' }, { status: 400 })
    }

    if (adjustment !== undefined && stockQuantity !== undefined) {
      return NextResponse.json({ error: 'Cannot specify both adjustment and stockQuantity' }, { status: 400 })
    }

    if (adjustment !== undefined && (!Number.isInteger(adjustment) || typeof adjustment !== 'number')) {
      return NextResponse.json({ error: 'Adjustment must be an integer' }, { status: 400 })
    }

    if (
      stockQuantity !== undefined &&
      (typeof stockQuantity !== 'number' || !Number.isInteger(stockQuantity) || stockQuantity < 0)
    ) {
      return NextResponse.json({ error: 'Stock quantity must be a non-negative integer' }, { status: 400 })
    }

    if (
      reorderLevel !== undefined &&
      (typeof reorderLevel !== 'number' || !Number.isInteger(reorderLevel) || reorderLevel < 0)
    ) {
      return NextResponse.json({ error: 'Reorder level must be a non-negative integer' }, { status: 400 })
    }

    const existing = await prisma.sparePart.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 })
    }

    const nextStock =
      typeof adjustment === 'number'
        ? existing.stockQuantity + adjustment
        : typeof stockQuantity === 'number'
        ? stockQuantity
        : existing.stockQuantity

    if (nextStock < 0) {
      return NextResponse.json({ error: 'Resulting stock quantity cannot be negative' }, { status: 400 })
    }

    const nextReorder = typeof reorderLevel === 'number' ? reorderLevel : existing.reorderLevel

    const updated = await prisma.sparePart.update({
      where: { id },
      data: {
        stockQuantity: nextStock,
        reorderLevel: nextReorder,
      },
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    const prismaError = error as { code?: string }
    if (prismaError?.code === 'P2025') {
      return NextResponse.json({ error: 'Spare part not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update spare part' }, { status: 500 })
  }
}
