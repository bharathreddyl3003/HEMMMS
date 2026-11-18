import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
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
    const requisition = await prisma.purchaseRequisition.create({
      data: body,
      include: {
        sparePart: true
      }
    })
    return NextResponse.json(requisition, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create purchase requisition' }, { status: 500 })
  }
}
