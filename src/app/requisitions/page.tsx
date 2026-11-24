import prisma from '@/lib/prisma';
import CreatePRModal from '@/components/CreatePRModal';

export const dynamic = 'force-dynamic';

export default async function Requisitions() {
  const [requisitions, spares] = await Promise.all([
    prisma.purchaseRequisition.findMany({
      include: { sparePart: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.sparePart.findMany({
      orderBy: { name: 'asc' }
    })
  ]);

  const pendingCount = requisitions.filter(r => r.status === 'Pending').length;
  const deliveredCount = requisitions.filter(r => r.status === 'Delivered').length;

  return (
    <main style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '0.3rem' }}>
            Procurement &amp; Replenishment
          </div>
          <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Purchase Requisitions (PR)
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Track open indent requests, pending orders, and delivered spares stock
          </p>
        </div>
        <CreatePRModal spareParts={spares} />
      </div>

      {/* Summary KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Total Requisitions
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#f8fafc' }}>
            {requisitions.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: `3px solid ${pendingCount > 0 ? '#f59e0b' : '#10b981'}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Pending Approval / Order
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: pendingCount > 0 ? '#fbbf24' : '#34d399' }}>
            {pendingCount}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Delivered
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#34d399' }}>
            {deliveredCount}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        {requisitions.length === 0 ? (
          <p className="text-sm" style={{ padding: '2rem', textAlign: 'center', margin: 0 }}>
            No purchase requisitions found.
          </p>
        ) : (
          <div tabIndex={0} role="region" aria-label="Purchase Requisitions Table" className="table-wrapper" style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}>
            <table className="hemmms-table" style={{ minWidth: '720px' }}>
              <thead>
                <tr>
                  <th scope="col" style={{ padding: '0.9rem 1rem' }}>PR ID</th>
                  <th scope="col" style={{ padding: '0.9rem 1rem' }}>Spare Part</th>
                  <th scope="col" style={{ padding: '0.9rem 1rem' }}>Part Number</th>
                  <th scope="col" style={{ padding: '0.9rem 1rem' }}>Quantity</th>
                  <th scope="col" style={{ padding: '0.9rem 1rem' }}>Order Date</th>
                  <th scope="col" style={{ padding: '0.9rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((pr) => (
                  <tr key={pr.id}>
                    <th scope="row" className="tabular-nums" style={{ padding: '0.95rem 1rem', color: 'var(--text-secondary)', fontWeight: 500, textAlign: 'left' }}>
                      #{pr.id.slice(0, 8)}
                    </th>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 600, color: '#f8fafc' }}>{pr.sparePart.name}</td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', color: '#38bdf8' }}>{pr.sparePart.partNumber}</td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', fontWeight: 600 }}>{pr.quantity}</td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', color: '#cbd5e1' }}>
                      {pr.orderDate ? new Date(pr.orderDate).toLocaleDateString('en-GB') : 'N/A'}
                    </td>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      <span className={`badge ${pr.status === 'Delivered' ? 'success' : pr.status === 'Pending' ? 'warning' : 'accent'}`}>
                        {pr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
