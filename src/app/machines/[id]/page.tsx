import Link from 'next/link';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import AddLogModal from '@/components/AddLogModal';
import EditMachineModal from '@/components/EditMachineModal';
import EditSubassemblyModal from '@/components/EditSubassemblyModal';
import AddSubassemblyModal from '@/components/AddSubassemblyModal';
import ScheduledMaintenanceTab from '@/components/ScheduledMaintenanceTab';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MachineDetail(
  props: { 
    params: Promise<{ id: string }>,
    searchParams: Promise<{ tab?: string }>
  }
) {
  const session = await getSession();
  const canEdit = session?.role === 'ADMIN' || session?.permissions?.canEditMachines;
  const canManageScheduledMaintenance = session?.role === 'ADMIN' || session?.permissions?.canManageScheduledMaintenance;
  
  const params = await props.params;
  const searchParams = await props.searchParams;
  const currentTab = searchParams.tab || 'overview';

  const machine = await prisma.machine.findUnique({
    where: { id: params.id },
    include: {
      subassemblies: true,
      maintenanceLogs: { orderBy: { createdAt: 'desc' } }
    }
  });

  if (!machine) {
    notFound();
  }

  return (
    <>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="mb-4 flex-between">
          <Link href="/" style={{ color: 'var(--accent)', textDecoration: 'none' }}>&larr; Back to Dashboard</Link>
          {canEdit && <EditMachineModal machine={machine} />}
        </div>

        <div className="glass-panel mb-4">
          <div className="flex-between responsive-hero" style={{ alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{machine.name}</h1>
              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                <span><strong>Model:</strong> {machine.model}</span>
                <span>&bull;</span>
                <span><strong>Type:</strong> {machine.type}</span>
                {machine.serialNumber && (
                  <>
                    <span>&bull;</span>
                    <span><strong>S/N:</strong> {machine.serialNumber}</span>
                  </>
                )}
                {machine.commissioningDate && (
                  <>
                    <span>&bull;</span>
                    <span><strong>Commissioned:</strong> {new Date(machine.commissioningDate).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={`badge ${machine.status === 'Working' ? 'success' : machine.status === 'Under Maintenance' ? 'warning' : 'danger'} mb-2`} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem' }}>
                {machine.status}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit, sans-serif' }}>
                {machine.runningHours} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>HMR</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
          <Link 
            href={`/machines/${machine.id}?tab=overview`}
            style={{ 
              padding: '0.75rem 1.5rem', 
              textDecoration: 'none',
              color: currentTab === 'overview' ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: currentTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: currentTab === 'overview' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            Overview
          </Link>
          {canManageScheduledMaintenance && (
            <Link 
              href={`/machines/${machine.id}?tab=scheduled`}
              style={{ 
                padding: '0.75rem 1.5rem', 
                textDecoration: 'none',
                color: currentTab === 'scheduled' ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: currentTab === 'scheduled' ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: currentTab === 'scheduled' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              Scheduled Maintenance
            </Link>
          )}
        </div>

        {currentTab === 'overview' && (
          <div className="responsive-grid">
            <div>
              <div className="flex-between mb-4">
                <h2>Subassemblies Health</h2>
                {canEdit && <AddSubassemblyModal machineId={machine.id} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '10px' }}>
                {machine.subassemblies.map(sub => {
                  const healthPercent = Math.min(100, Math.max(0, 100 - (sub.currentHours / sub.lifeExpectancyHours) * 100));
                  return (
                    <div key={sub.id} className="glass-panel" style={{ padding: '1.25rem' }}>
                      <div className="flex-between mb-3">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{sub.name}</h3>
                          {canEdit && <EditSubassemblyModal subassembly={sub} />}
                        </div>
                        <span className={`badge ${sub.healthStatus === 'Good' ? 'success' : sub.healthStatus === 'Warning' ? 'warning' : 'danger'}`}>
                          {sub.healthStatus}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div style={{ flex: 1 }}>
                          <div className="flex-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                            <span>Life Remaining</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{healthPercent.toFixed(1)}%</strong>
                          </div>
                          <div style={{ background: 'rgba(255,255,255,0.05)', height: '12px', borderRadius: '6px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${healthPercent}%`, 
                              background: healthPercent > 50 ? 'var(--success)' : healthPercent > 20 ? 'var(--warning)' : 'var(--danger)',
                              transition: 'width 1s ease-in-out',
                              boxShadow: '0 0 10px rgba(0,0,0,0.5)'
                            }} />
                          </div>
                        </div>
                        
                        <div style={{ textAlign: 'right', minWidth: '100px' }}>
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Hours Used</div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{sub.currentHours}</div>
                          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>of {sub.lifeExpectancyHours}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex-between mb-4">
                <h2>Daily Logs & History</h2>
                <AddLogModal machineId={machine.id} />
              </div>
              <div className="glass-panel" style={{ padding: '1.5rem', maxHeight: '600px', overflowY: 'auto' }}>
                {machine.maintenanceLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    No logs recorded yet.
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Timeline vertical line */}
                    <div style={{ position: 'absolute', left: '15px', top: '10px', bottom: '10px', width: '2px', background: 'var(--border)' }}></div>
                    
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.5rem', margin: 0, padding: 0 }}>
                      {machine.maintenanceLogs.map(log => (
                        <li key={log.id} style={{ position: 'relative', paddingLeft: '40px' }}>
                          {/* Timeline dot */}
                          <div style={{ 
                            position: 'absolute', 
                            left: '11px', 
                            top: '5px', 
                            width: '10px', 
                            height: '10px', 
                            borderRadius: '50%', 
                            background: log.logType === 'Scheduled Maintenance' ? 'var(--accent)' : log.logType === 'Repair' ? 'var(--danger)' : 'var(--success)',
                            boxShadow: '0 0 0 4px var(--surface)'
                          }}></div>
                          
                          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem' }}>
                            <div className="flex-between mb-2">
                              <span className={`badge ${log.logType === 'Scheduled Maintenance' ? 'primary' : log.logType === 'Repair' ? 'danger' : 'success'}`}>
                                {log.logType}
                              </span>
                              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{new Date(log.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>{log.description}</p>
                            
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {log.hmr && (
                                <span><strong style={{ color: 'var(--text-primary)' }}>HMR:</strong> {log.hmr}</span>
                              )}
                              <span><strong style={{ color: 'var(--text-primary)' }}>Status:</strong> {log.status}</span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentTab === 'scheduled' && canManageScheduledMaintenance && (
          <ScheduledMaintenanceTab 
            machineId={machine.id} 
            currentMachineHmr={machine.runningHours} 
            canEdit={canEdit || canManageScheduledMaintenance}
          />
        )}
      </main>
    </>
  );
}
