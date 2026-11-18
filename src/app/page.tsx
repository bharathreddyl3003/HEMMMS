import Link from 'next/link';
import prisma from '@/lib/prisma';
import ScheduleMaintenanceModal from '@/components/ScheduleMaintenanceModal';
import AddMachineModal from '@/components/AddMachineModal';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const session = await getSession();
  const canEdit = session?.role === 'ADMIN' || session?.permissions?.canEditMachines;

  const machines = await prisma.machine.findMany({
    include: { subassemblies: true },
    orderBy: { name: 'asc' },
  });

  return (
    <>

      <main style={{ padding: '2rem' }}>
        <div className="flex-between mb-4">
          <h1>Fleet Overview</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <ScheduleMaintenanceModal machines={machines.map(m => ({ id: m.id, name: m.name }))} />
            {canEdit && <AddMachineModal />}
          </div>
        </div>

        <div className="grid-dashboard">
          {machines.map((machine) => {
            const isWarning = machine.subassemblies.some(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical');
            const badgeClass = machine.status === 'Working' && !isWarning ? 'success' : isWarning ? 'warning' : 'danger';

            return (
              <Link href={`/machines/${machine.id}`} key={machine.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="glass-panel">
                  <div className="flex-between mb-2">
                    <h2>{machine.name}</h2>
                    <span className={`badge ${badgeClass}`}>{machine.status}</span>
                  </div>
                  <div className="text-sm mb-4">
                    <strong>Model:</strong> {machine.model} | {machine.type}
                  </div>
                  
                  <h3>Subassemblies Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {machine.subassemblies.slice(0, 3).map(sub => (
                      <div key={sub.id} className="flex-between">
                        <span>{sub.name}</span>
                        <span style={{ 
                          color: sub.healthStatus === 'Good' ? 'var(--success)' : sub.healthStatus === 'Warning' ? 'var(--warning)' : 'var(--danger)',
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          {sub.healthStatus}
                        </span>
                      </div>
                    ))}
                    {machine.subassemblies.length > 3 && (
                      <div className="text-sm mt-4">+ {machine.subassemblies.length - 3} more</div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex-between text-sm">
                      <span>Total Running Hrs</span>
                      <strong>{machine.runningHours} hrs</strong>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
