import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
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
    const spare = await prisma.sparePart.create({
      data: body
    })
    return NextResponse.json(spare, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create spare part' }, { status: 500 })
  }
}
