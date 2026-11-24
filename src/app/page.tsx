import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import DashboardView from '@/components/DashboardView';

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: {
  searchParams: Promise<{ module?: string }>
}) {
  const session = await getSession();
  const canEdit = session?.role === 'ADMIN' || session?.permissions?.canEditMachines;

  const searchParams = await props.searchParams;
  const activeModule = searchParams.module === 'drills' ? 'drills' : 'shovels';

  // Fetch all machines with subassemblies once
  const allMachines = await prisma.machine.findMany({
    include: { subassemblies: true },
    orderBy: { name: 'asc' },
  });

  return (
    <DashboardView
      allMachines={allMachines as any}
      initialModule={activeModule}
      canEdit={canEdit}
    />
  );
}
