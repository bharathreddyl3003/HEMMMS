import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import InventoryView from '@/components/InventoryView';

export const dynamic = 'force-dynamic';

export default async function Inventory() {
  const session = await getSession();
  if (!session) redirect('/login');

  const canEdit = session.role === 'ADMIN' || !!session.permissions?.canEditSpares;
  const spares = await prisma.sparePart.findMany({
    orderBy: { name: 'asc' },
  });

  return <InventoryView initialSpares={spares} canEdit={canEdit} />;
}
