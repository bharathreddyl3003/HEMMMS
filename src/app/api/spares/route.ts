import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const spares = await prisma.sparePart.findMany()
    return NextResponse.json(spares)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch spare parts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canEditSpares)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, partNumber, stockQuantity, reorderLevel } = body || {}

    if (typeof name !== 'string' || !name.trim() || typeof partNumber !== 'string' || !partNumber.trim()) {
      return NextResponse.json({ error: 'Part name and part number are required' }, { status: 400 })
    }

    const qty = stockQuantity !== undefined ? Number(stockQuantity) : 0
    const reorder = reorderLevel !== undefined ? Number(reorderLevel) : 0
    if (!Number.isInteger(qty) || qty < 0 || !Number.isInteger(reorder) || reorder < 0) {
      return NextResponse.json({ error: 'Stock quantity and reorder level must be non-negative integers' }, { status: 400 })
    }

    const spare = await prisma.sparePart.create({
      data: {
        name: name.trim(),
        partNumber: partNumber.trim(),
        stockQuantity: qty,
        reorderLevel: reorder
      }
    })
    return NextResponse.json(spare, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Part number already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create spare part' }, { status: 500 })
  }
}
