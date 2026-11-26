import prisma from '@/lib/prisma';
import AddPartModal from '@/components/AddPartModal';

export const dynamic = 'force-dynamic';

export default async function Inventory() {
  const spares = await prisma.sparePart.findMany({
    orderBy: { name: 'asc' }
  });

  const lowStockCount = spares.filter(s => s.stockQuantity <= s.reorderLevel).length;
  const totalUnits = spares.reduce((sum, s) => sum + s.stockQuantity, 0);

  return (
    <main style={{ padding: '1.75rem 1.5rem 3rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex-between mb-6" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '0.3rem' }}>
            Storehouse &amp; Consumables Control
          </div>
          <h1 style={{ margin: 0, background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Spares Inventory
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Filters, lubricants, wear parts, and automatic low-stock alert thresholds
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <AddPartModal />
        </div>
      </div>

      {/* Inventory Telemetry Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Total SKUs
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#f8fafc' }}>
            {spares.length}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: '3px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Total Units in Stock
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: '#34d399' }}>
            {totalUnits.toLocaleString()}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem 1.25rem', borderInlineStart: `3px solid ${lowStockCount > 0 ? '#f43f5e' : '#10b981'}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Low Stock Alerts
          </div>
          <div className="tabular-nums" style={{ fontSize: '1.85rem', fontWeight: 700, marginTop: '0.35rem', color: lowStockCount > 0 ? '#fb7185' : '#34d399' }}>
            {lowStockCount}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div tabIndex={0} role="region" aria-label="Spares Inventory Table" className="table-wrapper" style={{ border: '1px solid var(--border)', background: 'rgba(6, 10, 20, 0.35)' }}>
          <table className="hemmms-table" style={{ minWidth: '640px' }}>
            <thead>
              <tr>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Part Number</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Name</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Stock Quantity</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Reorder Level</th>
                <th scope="col" style={{ padding: '0.9rem 1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {spares.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No spare parts registered yet.
                  </td>
                </tr>
              ) : spares.map((spare) => {
                const needsReorder = spare.stockQuantity <= spare.reorderLevel;
                return (
                  <tr
                    key={spare.id}
                    style={{
                      background: needsReorder ? 'rgba(244, 63, 94, 0.04)' : undefined,
                      boxShadow: needsReorder ? 'inset 3px 0 0 #f43f5e' : undefined
                    }}
                  >
                    <th scope="row" className="tabular-nums" style={{ padding: '0.95rem 1rem', color: '#38bdf8', fontWeight: 700, textAlign: 'left' }}>
                      {spare.partNumber}
                    </th>
                    <td style={{ padding: '0.95rem 1rem', fontWeight: 500, color: '#f8fafc' }}>{spare.name}</td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', fontWeight: 600, color: needsReorder ? '#fb7185' : '#e2e8f0' }}>
                      {spare.stockQuantity}
                    </td>
                    <td className="tabular-nums" style={{ padding: '0.95rem 1rem', color: '#94a3b8' }}>
                      {spare.reorderLevel}
                    </td>
                    <td style={{ padding: '0.95rem 1rem' }}>
                      {needsReorder ? (
                        <span className="badge danger">Low Stock</span>
                      ) : (
                        <span className="badge success">In Stock</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
