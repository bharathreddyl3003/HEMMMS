import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const body = await request.json()

    // Prevent changing the role to ensure only ADMIN remains ADMIN unless we specifically build that feature.
    // For now we only allow toggling boolean permissions.
    const { canEditMachines, canEditSpares, canManageMaintenance, canManageScheduledMaintenance } = body

    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: {
        ...(canEditMachines !== undefined && { canEditMachines }),
        ...(canEditSpares !== undefined && { canEditSpares }),
        ...(canManageMaintenance !== undefined && { canManageMaintenance }),
        ...(canManageScheduledMaintenance !== undefined && { canManageScheduledMaintenance }),
      },
      select: { id: true, username: true }
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
