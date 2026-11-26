"use server"

import { cookies } from 'next/headers'
import prisma from '@/lib/prisma'
import * as bcrypt from 'bcryptjs'
import { encrypt } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginUser(prevState: any, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { error: 'Please enter both username and password' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return { error: 'Invalid credentials' }
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return { error: 'Invalid credentials' }
    }

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
    
    const cookieStore = await cookies()
    cookieStore.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 1 day
    })

  } catch (error: any) {
    console.error("Login Server Action Error:", error)
    return { error: 'Internal server error: ' + error.message }
  }

  redirect('/')
}
