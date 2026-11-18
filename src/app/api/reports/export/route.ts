import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const records = await prisma.maintenanceRecord.findMany({
      include: {
        machine: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Build CSV Content
    const headers = [
      'Record ID',
      'Machine Name',
      'Machine Model',
      'Date & Time',
      'Log Type',
      'Subassembly',
      'HMR',
      'Technician',
      'Labor Hours',
      'Cost',
      'Parts Used',
      'Status',
      'Description'
    ]

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return ''
      const stringValue = String(str).replace(/"/g, '""')
      return `"${stringValue}"`
    }

    const rows = records.map(r => [
      escapeCsv(r.id),
      escapeCsv(r.machine.name),
      escapeCsv(r.machine.model),
      escapeCsv(new Date(r.createdAt).toISOString()),
      escapeCsv(r.logType),
      escapeCsv(r.subassemblyName || 'N/A'),
      r.hmr !== null ? r.hmr : '',
      escapeCsv(r.performedBy || 'N/A'),
      r.timeSpentHrs !== null ? r.timeSpentHrs : '',
      r.cost !== null ? r.cost : '',
      escapeCsv(r.partsUsed || ''),
      escapeCsv(r.status),
      escapeCsv(r.description)
    ].join(','))

    const csvContent = [headers.join(','), ...rows].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="HEMMMS_Maintenance_Report_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })
  } catch (error: any) {
    console.error('CSV Export Error:', error)
    return NextResponse.json({ error: 'Failed to generate CSV export' }, { status: 500 })
  }
}
