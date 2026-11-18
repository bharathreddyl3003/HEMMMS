import Link from 'next/link';
import prisma from '@/lib/prisma';
import CreatePRModal from '@/components/CreatePRModal';

export const dynamic = 'force-dynamic';

export default async function Requisitions() {
  const requisitions = await prisma.purchaseRequisition.findMany({
    include: { sparePart: true },
    orderBy: { createdAt: 'desc' }
  });

  const spares = await prisma.sparePart.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <>

      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div className="flex-between mb-4">
          <h1>Purchase Requisitions (PR)</h1>
          <CreatePRModal spareParts={spares} />
        </div>

        <div className="glass-panel" style={{ overflowX: 'auto' }}>
          {requisitions.length === 0 ? (
            <p className="text-sm">No purchase requisitions found.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>ID</th>
                  <th style={{ padding: '1rem' }}>Spare Part</th>
                  <th style={{ padding: '1rem' }}>Part Number</th>
                  <th style={{ padding: '1rem' }}>Quantity</th>
                  <th style={{ padding: '1rem' }}>Order Date</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {requisitions.map((pr) => (
                  <tr key={pr.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{pr.id.slice(0,8)}...</td>
                    <td style={{ padding: '1rem' }}><strong>{pr.sparePart.name}</strong></td>
                    <td style={{ padding: '1rem' }}>{pr.sparePart.partNumber}</td>
                    <td style={{ padding: '1rem' }}>{pr.quantity}</td>
                    <td style={{ padding: '1rem' }}>{pr.orderDate ? new Date(pr.orderDate).toLocaleDateString() : 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${pr.status === 'Delivered' ? 'success' : pr.status === 'Pending' ? 'warning' : 'accent'}`}>
                        {pr.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
