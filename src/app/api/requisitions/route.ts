import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const requisitions = await prisma.purchaseRequisition.findMany({
      include: {
        sparePart: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return NextResponse.json(requisitions)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch purchase requisitions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.role !== 'ADMIN' && !session.permissions?.canManagePRs)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { sparePartId, quantity, status, orderDate } = body || {}

    if (typeof sparePartId !== 'string' || !sparePartId.trim()) {
      return NextResponse.json({ error: 'Spare part selection is required' }, { status: 400 })
    }

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive integer' }, { status: 400 })
    }

    const parsedDate = orderDate ? new Date(orderDate) : new Date()
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid order date' }, { status: 400 })
    }

    const allowedStatuses = ['Pending', 'Ordered', 'Delivered']
    const safeStatus = typeof status === 'string' && allowedStatuses.includes(status) ? status : 'Pending'

    const requisition = await prisma.purchaseRequisition.create({
      data: {
        sparePartId: sparePartId.trim(),
        quantity: qty,
        status: safeStatus,
        orderDate: parsedDate
      },
      include: {
        sparePart: true
      }
    })
    return NextResponse.json(requisition, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create purchase requisition' }, { status: 500 })
  }
}
