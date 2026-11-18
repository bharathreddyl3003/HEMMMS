import Link from 'next/link';
import prisma from '@/lib/prisma';
import AddPartModal from '@/components/AddPartModal';
import CreatePRModal from '@/components/CreatePRModal';

export const dynamic = 'force-dynamic';

export default async function Inventory() {
  const spares = await prisma.sparePart.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="flex-between mb-4">
          <h1>Spares Inventory</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <AddPartModal />
          </div>
        </div>

        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem' }}>Part Number</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Stock Quantity</th>
                <th style={{ padding: '1rem' }}>Reorder Level</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {spares.map((spare) => {
                const needsReorder = spare.stockQuantity <= spare.reorderLevel;
                return (
                  <tr key={spare.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem' }}><strong>{spare.partNumber}</strong></td>
                    <td style={{ padding: '1rem' }}>{spare.name}</td>
                    <td style={{ padding: '1rem' }}>{spare.stockQuantity}</td>
                    <td style={{ padding: '1rem' }}>{spare.reorderLevel}</td>
                    <td style={{ padding: '1rem' }}>
                      {needsReorder ? (
                        <span className="badge danger">Low Stock</span>
                      ) : (
                        <span className="badge success">In Stock</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {needsReorder && (
                        <CreatePRModal 
                          spareParts={spares} 
                          defaultSparePartId={spare.id} 
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
