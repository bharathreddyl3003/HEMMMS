import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import MachineDetailView from '@/components/MachineDetailView';

export const dynamic = 'force-dynamic';

export default async function MachineDetail(
  props: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ tab?: string; from?: string; module?: string }>
  }
) {
  const session = await getSession();
  if (!session) redirect('/login');

  const canEdit = session.role === 'ADMIN' || !!session.permissions?.canEditMachines;
  const canManageScheduledMaintenance =
    session.role === 'ADMIN' || !!session.permissions?.canManageScheduledMaintenance;

  const params = await props.params;
  const searchParams = await props.searchParams;
  const currentTab = searchParams.tab || 'overview';

  const [machine, fleetMachines] = await Promise.all([
    prisma.machine.findUnique({
      where: { id: params.id },
      include: {
        subassemblies: true,
        maintenanceLogs: { orderBy: { createdAt: 'desc' } },
        scheduledMaintenances: true,
      },
    }),
    prisma.machine.findMany({
      select: { id: true, name: true, category: true, model: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!machine) {
    notFound();
  }

  return (
    <MachineDetailView
      machine={machine}
      canEdit={canEdit}
      canManageScheduledMaintenance={canManageScheduledMaintenance}
      initialTab={currentTab}
      initialFrom={searchParams.from}
      initialModule={searchParams.module}
      fleetMachines={fleetMachines}
    />
  );
}
