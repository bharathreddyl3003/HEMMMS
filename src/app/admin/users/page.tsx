import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AddUserModal from '@/components/AddUserModal'
import UserPermissionRow from '@/components/UserPermissionRow'

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    redirect('/')
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="flex-between mb-4">
        <h1>User Management (Admin)</h1>
        <AddUserModal />
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '1rem' }}>Username</th>
              <th style={{ padding: '1rem' }}>Role</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Edit Machines</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Edit Spares</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Manage Maintenance</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Manage Sched. Maint.</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserPermissionRow key={user.id} user={user} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
