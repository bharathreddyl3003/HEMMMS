import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import MachineDetailView from '@/components/MachineDetailView';

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
    <MachineDetailView
      machine={machine}
      canEdit={canEdit}
      canManageScheduledMaintenance={canManageScheduledMaintenance}
      initialTab={currentTab}
    />
  );
}
