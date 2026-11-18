import Link from 'next/link';
import prisma from '@/lib/prisma';
import ScheduleMaintenanceModal from '@/components/ScheduleMaintenanceModal';
import AddMachineModal from '@/components/AddMachineModal';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: {
  searchParams: Promise<{ module?: string }>
}) {
  const session = await getSession();
  const canEdit = session?.role === 'ADMIN' || session?.permissions?.canEditMachines;

  const searchParams = await props.searchParams;
  const activeModule = searchParams.module === 'drills' ? 'drills' : 'shovels';

  // Fetch all machines with subassemblies
  const allMachines = await prisma.machine.findMany({
    include: { subassemblies: true },
    orderBy: { name: 'asc' },
  });

  const shovels = allMachines.filter(m => m.category === 'Shovel');
  const drills = allMachines.filter(m => m.category === 'Drill' || !m.category);

  const displayedMachines = activeModule === 'shovels' ? shovels : drills;

  return (
    <main style={{ padding: '2rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Fleet Command Center
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Heavy Earth Moving Machinery Management System
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <ScheduleMaintenanceModal machines={allMachines.map(m => ({ id: m.id, name: m.name }))} />
          {canEdit && (
            <AddMachineModal defaultCategory={activeModule === 'shovels' ? 'Shovel' : 'Drill'} />
          )}
        </div>
      </div>

      {/* Module Switcher Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0.75rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid var(--border)',
        paddingBottom: '0.75rem'
      }}>
        <Link
          href="/?module=shovels"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '1.05rem',
            fontWeight: activeModule === 'shovels' ? 700 : 500,
            background: activeModule === 'shovels' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeModule === 'shovels' ? '#38bdf8' : 'var(--text-secondary)',
            border: activeModule === 'shovels' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: activeModule === 'shovels' ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🚜</span>
          <span>Shovels Module</span>
          <span style={{ 
            background: activeModule === 'shovels' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
            color: activeModule === 'shovels' ? '#0f172a' : '#cbd5e1',
            borderRadius: '999px',
            padding: '0.15rem 0.55rem',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {shovels.length}
          </span>
        </Link>

        <Link
          href="/?module=drills"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontSize: '1.05rem',
            fontWeight: activeModule === 'drills' ? 700 : 500,
            background: activeModule === 'drills' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeModule === 'drills' ? '#38bdf8' : 'var(--text-secondary)',
            border: activeModule === 'drills' ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: activeModule === 'drills' ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.3rem' }}>🛠️</span>
          <span>Drills Module</span>
          <span style={{ 
            background: activeModule === 'drills' ? '#38bdf8' : 'rgba(255,255,255,0.1)',
            color: activeModule === 'drills' ? '#0f172a' : '#cbd5e1',
            borderRadius: '999px',
            padding: '0.15rem 0.55rem',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {drills.length}
          </span>
        </Link>
      </div>

      {/* Module Overview Banner & Mini Stats */}
      {activeModule === 'shovels' ? (
        <div className="glass-panel mb-6" style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(0,0,0,0.2) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚜 Hydraulic Excavators & Shovels Fleet ({shovels.length} Units)
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                4x BEML BE-1000 (6.5 Cu.M) &bull; 4x Tata Hitachi EX1200 (5.0 Cu.M) &bull; 1x Komatsu PC450 (3.0 Cu.M)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.4rem 0.75rem' }}>
                6.5 Cu.M: 4 units (B1, B2, B3, B18)
              </span>
              <span className="badge" style={{ background: 'rgba(250, 204, 21, 0.15)', color: '#facc15', padding: '0.4rem 0.75rem' }}>
                5.0 Cu.M: 4 units (T2, T3, T5, T6)
              </span>
              <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '0.4rem 0.75rem' }}>
                3.0 Cu.M: 1 unit (S3)
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel mb-6" style={{ padding: '1rem 1.5rem', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(0,0,0,0.2) 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🛠️ Rotary Blast Hole Drills Fleet ({drills.length} Units)
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                3x Sandvik IDM30 (DM11, DM12, DM14) &bull; 2x Atlas Copco REL650 (DM15, DM16)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.4rem 0.75rem' }}>
                IDM30: 3 units (150mm)
              </span>
              <span className="badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', padding: '0.4rem 0.75rem' }}>
                REL650: 2 units (150mm)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Equipment Cards Grid */}
      <div className="grid-dashboard">
        {displayedMachines.map((machine) => {
          const isWarning = machine.subassemblies.some(s => s.healthStatus === 'Warning' || s.healthStatus === 'Critical');
          const badgeClass = machine.status === 'Working' && !isWarning ? 'success' : isWarning ? 'warning' : 'danger';

          return (
            <Link href={`/machines/${machine.id}`} key={machine.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="glass-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s, border-color 0.2s' }}>
                <div>
                  <div className="flex-between mb-2">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>
                        {machine.category === 'Shovel' ? '🚜' : '🛠️'}
                      </span>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--accent)' }}>{machine.name}</h2>
                    </div>
                    <span className={`badge ${badgeClass}`}>{machine.status}</span>
                  </div>

                  <div className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {machine.make && <strong>{machine.make} </strong>}
                    {machine.model}
                    {machine.capacity && (
                      <span className="badge" style={{ marginLeft: '0.5rem', background: 'rgba(255,255,255,0.08)', fontSize: '0.75rem', color: '#e2e8f0' }}>
                        {machine.capacity}
                      </span>
                    )}
                  </div>
                  
                  <h3 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Subassemblies Health
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {machine.subassemblies.slice(0, 4).map(sub => (
                      <div key={sub.id} className="flex-between" style={{ fontSize: '0.85rem' }}>
                        <span style={{ color: '#cbd5e1' }}>{sub.name}</span>
                        <span style={{ 
                          color: sub.healthStatus === 'Good' ? 'var(--success)' : sub.healthStatus === 'Warning' ? 'var(--warning)' : 'var(--danger)',
                          fontWeight: '600'
                        }}>
                          {sub.healthStatus}
                        </span>
                      </div>
                    ))}
                    {machine.subassemblies.length > 4 && (
                      <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        + {machine.subassemblies.length - 4} more components
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="flex-between text-sm">
                    <span style={{ color: 'var(--text-secondary)' }}>Total Running HMR</span>
                    <strong style={{ fontSize: '1.1rem', fontFamily: 'Outfit, sans-serif', color: '#38bdf8' }}>
                      {machine.runningHours.toFixed(1)} hrs
                    </strong>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
