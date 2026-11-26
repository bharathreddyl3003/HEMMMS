import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import DashboardView, { type DashboardTab } from '@/components/DashboardView';

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: {
  searchParams: Promise<{ module?: string; tab?: string }>
}) {
  const session = await getSession();
  if (!session) redirect('/login');

  const canEdit = session.role === 'ADMIN' || !!session.permissions?.canEditMachines;

  const searchParams = await props.searchParams;
  const activeModule = searchParams.module === 'drills' ? 'drills' : 'shovels';
  const rawTab = searchParams.tab;
  const initialTab: DashboardTab =
    rawTab === 'hmr' || rawTab === 'maintenance' || rawTab === 'field'
      ? rawTab
      : 'fleet';

  const [allMachines, initialCompletions, spareParts] = await Promise.all([
    prisma.machine.findMany({
      include: {
        subassemblies: true,
        scheduledMaintenances: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.maintenanceRecord.findMany({
      where: {
        logType: 'Scheduled Maintenance',
        status: 'Completed',
      },
      include: {
        machine: {
          include: {
            scheduledMaintenances: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.sparePart.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <DashboardView
      allMachines={allMachines as Parameters<typeof DashboardView>[0]['allMachines']}
      initialModule={activeModule}
      initialTab={initialTab}
      initialCompletions={initialCompletions as Parameters<typeof DashboardView>[0]['initialCompletions']}
      spareParts={spareParts}
      canEdit={canEdit}
    />
  );
}
