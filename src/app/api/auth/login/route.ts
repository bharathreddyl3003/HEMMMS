import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { encrypt } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body || {}

    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() }
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: {
        canEditMachines: user.canEditMachines,
        canEditSpares: user.canEditSpares,
        canManageMaintenance: user.canManageMaintenance,
        canManagePRs: user.canManagePRs,
        canManageScheduledMaintenance: user.canManageScheduledMaintenance
      }
    }

    const sessionToken = await encrypt(sessionData)
    
    const response = NextResponse.json({ success: true })
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1 day
    })

    return response
  } catch (error) {
    console.error("Login API Error:", error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
