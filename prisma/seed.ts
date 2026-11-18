import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // 1. Seed Admin User
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      canEditMachines: true,
      canEditSpares: true,
      canManageMaintenance: true,
      canManagePRs: true,
      canManageScheduledMaintenance: true,
    },
  })
  console.log('Seeded admin user:', admin.username)

  // 2. Seed Operator/User
  const userPassword = await bcrypt.hash('user123', 10)
  const regularUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: userPassword,
      role: 'USER',
      canEditMachines: false,
      canEditSpares: true,
      canManageMaintenance: false,
      canManagePRs: false,
      canManageScheduledMaintenance: false,
    },
  })
  console.log('Seeded standard user:', regularUser.username)

  // 3. Seed Drills Fleet (3x IDM30, 2x REL650)
  const drills = [
    {
      name: 'DM11',
      model: 'IDM30',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 29595.0,
      serialNumber: '56789',
      commissioningDate: new Date('2017-04-05'),
    },
    {
      name: 'DM12',
      model: 'IDM30',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 31567.0,
      serialNumber: '56790',
      commissioningDate: new Date('2016-11-20'),
    },
    {
      name: 'DM14',
      model: 'IDM30',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 29876.0,
      serialNumber: '56792',
      commissioningDate: new Date('2017-08-15'),
    },
    {
      name: 'DM15',
      model: 'REL650',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 15643.0,
      serialNumber: 'REL-001',
      commissioningDate: new Date('2020-02-10'),
    },
    {
      name: 'DM16',
      model: 'REL650',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 14567.0,
      serialNumber: 'REL-002',
      commissioningDate: new Date('2020-06-18'),
    },
  ]

  for (const drill of drills) {
    let machine = await prisma.machine.findFirst({
      where: { name: drill.name },
    })

    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          ...drill,
          subassemblies: {
            create: [
              { name: 'Engine', lifeExpectancyHours: 10000, currentHours: 2000, healthStatus: 'Good' },
              { name: 'Compressor', lifeExpectancyHours: 8000, currentHours: 1500, healthStatus: 'Good' },
              { name: 'Hydraulic Pump', lifeExpectancyHours: 5000, currentHours: 4000, healthStatus: 'Warning' },
              { name: 'Rotary Head', lifeExpectancyHours: 6000, currentHours: 1000, healthStatus: 'Good' },
            ],
          },
          scheduledMaintenances: {
            create: [
              { type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: drill.runningHours },
              { type: 'Compressor', intervalHrs: 500, lastMaintenanceHmr: drill.runningHours },
              { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: drill.runningHours },
            ],
          },
        },
      })
      console.log(`Created machine: ${machine.name} (${machine.model})`)
    }
  }

  // 4. Seed Spare Parts
  const spares = [
    { name: 'Engine Filter', partNumber: 'EF-001', stockQuantity: 50, reorderLevel: 10 },
    { name: 'Hydraulic Oil 20L', partNumber: 'HO-20', stockQuantity: 20, reorderLevel: 5 },
    { name: 'Rotary Seal Kit', partNumber: 'RSK-100', stockQuantity: 2, reorderLevel: 5 },
    { name: 'Compressor Valve', partNumber: 'CV-250', stockQuantity: 8, reorderLevel: 10 },
  ]

  for (const spare of spares) {
    await prisma.sparePart.upsert({
      where: { partNumber: spare.partNumber },
      update: {},
      create: spare,
    })
    console.log(`Seeded spare part: ${spare.name} (${spare.partNumber})`)
  }

  console.log('Seeding finished successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
