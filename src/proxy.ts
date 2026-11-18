import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get('session')?.value
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = await decrypt(session)
    // If attempting to access admin routes, verify role
    if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Restrict inventory module
    if (pathname.startsWith('/inventory') && payload.role !== 'ADMIN' && !payload.permissions?.canEditSpares) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // Restrict PRs module
    if (pathname.startsWith('/requisitions') && payload.role !== 'ADMIN' && !payload.permissions?.canManagePRs) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
