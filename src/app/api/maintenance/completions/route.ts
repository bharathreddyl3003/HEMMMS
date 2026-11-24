import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') // 'Shovel' | 'Drill' | null

    const whereClause: any = {
      logType: 'Scheduled Maintenance',
      status: 'Completed'
    }

    if (category) {
      whereClause.machine = {
        category: category
      }
    }

    const records = await prisma.maintenanceRecord.findMany({
      where: whereClause,
      include: {
        machine: {
          include: {
            scheduledMaintenances: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json({ records })
  } catch (error: any) {
    console.error('Fetch completions error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch completions' }, { status: 500 })
  }
}
