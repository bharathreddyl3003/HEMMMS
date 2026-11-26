// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { encrypt } from '@/lib/auth'

function makeRequest(path: string, sessionCookie?: string) {
  const url = `http://localhost:3000${path}`
  const headers = new Headers()
  if (sessionCookie) {
    headers.set('cookie', `session=${sessionCookie}`)
  }
  return new NextRequest(url, { headers })
}

describe('src/proxy.ts route guard', () => {
  it('allows public paths (/login, /api/auth/*) without a cookie', async () => {
    const loginRes = await proxy(makeRequest('/login'))
    expect(loginRes.status).toBe(200)
    expect(loginRes.headers.get('location')).toBeNull()

    const authApiRes = await proxy(makeRequest('/api/auth/login'))
    expect(authApiRes.status).toBe(200)
  })

  it('redirects unauthenticated requests to /login', async () => {
    const res = await proxy(makeRequest('/hmr-register'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('redirects invalid/corrupted session tokens to /login', async () => {
    const res = await proxy(makeRequest('/', 'invalid-token'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login')
  })

  it('restricts /admin, /inventory, and /requisitions for unauthorized roles', async () => {
    const regularToken = await encrypt({
      userId: 'u1',
      role: 'USER',
      permissions: { canEditSpares: false, canManagePRs: false },
    })

    const adminRes = await proxy(makeRequest('/admin/users', regularToken))
    expect(adminRes.status).toBe(307)
    expect(adminRes.headers.get('location')).toBe('http://localhost:3000/')

    const invRes = await proxy(makeRequest('/inventory', regularToken))
    expect(invRes.status).toBe(307)
    expect(invRes.headers.get('location')).toBe('http://localhost:3000/')

    const prRes = await proxy(makeRequest('/requisitions', regularToken))
    expect(prRes.status).toBe(307)
    expect(prRes.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('permits ADMIN and explicitly permitted users to access protected modules', async () => {
    const sparesUserToken = await encrypt({
      userId: 'u2',
      role: 'USER',
      permissions: { canEditSpares: true, canManagePRs: true },
    })

    expect((await proxy(makeRequest('/inventory', sparesUserToken))).status).toBe(200)
    expect((await proxy(makeRequest('/requisitions', sparesUserToken))).status).toBe(200)

    const adminToken = await encrypt({ userId: 'a1', role: 'ADMIN', permissions: {} })
    expect((await proxy(makeRequest('/admin/users', adminToken))).status).toBe(200)
  })
})
