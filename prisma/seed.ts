import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting full fleet seeding (Shovels & Drills)...')

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

  // 3. Update Existing Drills with Category & Make
  const drills = [
    {
      name: 'DM11',
      model: 'IDM30',
      category: 'Drill',
      make: 'Sandvik',
      capacity: '150mm Hole',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 29595.0,
      serialNumber: '56789',
      commissioningDate: new Date('2017-04-05'),
    },
    {
      name: 'DM12',
      model: 'IDM30',
      category: 'Drill',
      make: 'Sandvik',
      capacity: '150mm Hole',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 31567.0,
      serialNumber: '56790',
      commissioningDate: new Date('2016-11-20'),
    },
    {
      name: 'DM14',
      model: 'IDM30',
      category: 'Drill',
      make: 'Sandvik',
      capacity: '150mm Hole',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 29876.0,
      serialNumber: '56792',
      commissioningDate: new Date('2017-08-15'),
    },
    {
      name: 'DM15',
      model: 'REL650',
      category: 'Drill',
      make: 'Atlas Copco / Epiroc',
      capacity: '150mm Hole',
      type: 'RBH 150mm drill',
      status: 'Working',
      runningHours: 15643.0,
      serialNumber: 'REL-001',
      commissioningDate: new Date('2020-02-10'),
    },
    {
      name: 'DM16',
      model: 'REL650',
      category: 'Drill',
      make: 'Atlas Copco / Epiroc',
      capacity: '150mm Hole',
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
      console.log(`Created drill: ${machine.name}`)
    } else {
      await prisma.machine.update({
        where: { id: machine.id },
        data: {
          category: 'Drill',
          make: drill.make,
          capacity: drill.capacity
        }
      })
      console.log(`Updated drill specifications: ${drill.name}`)
    }
  }

  // 4. Seed Shovels Fleet (9 Units: 4x BEML BE-1000, 4x Tata Hitachi EX1200, 1x Komatsu PC450)
  const shovels = [
    // 4 nos BEML Make BE-1000 Model 6.5 CuM Shovels
    {
      name: 'B1',
      model: 'BE-1000',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 18450.0,
      serialNumber: 'BE1000-01',
      commissioningDate: new Date('2018-03-15')
    },
    {
      name: 'B2',
      model: 'BE-1000',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 17220.0,
      serialNumber: 'BE1000-02',
      commissioningDate: new Date('2018-07-20')
    },
    {
      name: 'B3',
      model: 'BE-1000',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 19100.0,
      serialNumber: 'BE1000-03',
      commissioningDate: new Date('2017-11-10')
    },
    {
      name: 'B18',
      model: 'BE-1000',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 14890.0,
      serialNumber: 'BE1000-18',
      commissioningDate: new Date('2019-09-05')
    },
    // 4 nos Tata Hitachi EX1200 5 CuM Shovels
    {
      name: 'T2',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5.0 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 21450.0,
      serialNumber: 'TH-EX1200-02',
      commissioningDate: new Date('2017-01-12')
    },
    {
      name: 'T3',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5.0 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 20890.0,
      serialNumber: 'TH-EX1200-03',
      commissioningDate: new Date('2017-05-18')
    },
    {
      name: 'T5',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5.0 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 16400.0,
      serialNumber: 'TH-EX1200-05',
      commissioningDate: new Date('2019-02-22')
    },
    {
      name: 'T6',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5.0 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 15300.0,
      serialNumber: 'TH-EX1200-06',
      commissioningDate: new Date('2019-08-14')
    },
    // 1 no Komatsu PC450 3 CuM Shovel (S3)
    {
      name: 'S3',
      model: 'PC450',
      category: 'Shovel',
      make: 'Komatsu',
      capacity: '3.0 Cu.M',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 12560.0,
      serialNumber: 'KOM-PC450-03',
      commissioningDate: new Date('2021-04-10')
    }
  ]

  for (const shovel of shovels) {
    let machine = await prisma.machine.findFirst({
      where: { name: shovel.name },
    })

    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          ...shovel,
          // Shovel subassemblies (NO compressor)
          subassemblies: {
            create: [
              { name: 'Engine / Prime Mover', lifeExpectancyHours: 10000, currentHours: 2200, healthStatus: 'Good' },
              { name: 'Hydraulic System & Pumps', lifeExpectancyHours: 6000, currentHours: 1800, healthStatus: 'Good' },
              { name: 'Swing Device & Machinery', lifeExpectancyHours: 8000, currentHours: 2400, healthStatus: 'Good' },
              { name: `Attachment (Boom, Arm, ${shovel.capacity} Bucket)`, lifeExpectancyHours: 7000, currentHours: 1900, healthStatus: 'Good' },
              { name: 'Undercarriage & Tracks', lifeExpectancyHours: 5000, currentHours: 3500, healthStatus: 'Warning' },
            ],
          },
          // Shovel scheduled maintenance (Engine & Hydraulic - NO COMPRESSOR!)
          scheduledMaintenances: {
            create: [
              { type: 'Engine', intervalHrs: 250, lastMaintenanceHmr: shovel.runningHours },
              { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: shovel.runningHours },
            ],
          },
        },
      })
      console.log(`Created shovel: ${machine.name} (${machine.make} ${machine.model} - ${machine.capacity})`)
    } else {
      await prisma.machine.update({
        where: { id: machine.id },
        data: {
          category: 'Shovel',
          make: shovel.make,
          capacity: shovel.capacity,
          model: shovel.model,
          type: shovel.type
        }
      })
      console.log(`Updated shovel specifications: ${shovel.name}`)
    }
  }

  // 5. Seed Common Spare Parts (Drills & Shovels)
  const spares = [
    { name: 'Engine Oil Filter', partNumber: 'EF-001', stockQuantity: 60, reorderLevel: 15 },
    { name: 'Hydraulic Oil 20L', partNumber: 'HO-20', stockQuantity: 40, reorderLevel: 10 },
    { name: 'Rotary Seal Kit', partNumber: 'RSK-100', stockQuantity: 6, reorderLevel: 3 },
    { name: 'Compressor Valve (Drills)', partNumber: 'CV-250', stockQuantity: 8, reorderLevel: 10 },
    { name: 'Shovel Bucket Tooth (BE-1000)', partNumber: 'BT-6500', stockQuantity: 24, reorderLevel: 8 },
    { name: 'EX1200 Hydraulic Return Filter', partNumber: 'TH-HF-1200', stockQuantity: 12, reorderLevel: 4 },
    { name: 'Komatsu PC450 Track Shoe Pin', partNumber: 'KOM-TP-450', stockQuantity: 30, reorderLevel: 10 },
  ]

  for (const spare of spares) {
    await prisma.sparePart.upsert({
      where: { partNumber: spare.partNumber },
      update: {},
      create: spare,
    })
    console.log(`Seeded spare part: ${spare.name} (${spare.partNumber})`)
  }

  console.log('Seeding finished successfully! All 9 Shovels and 5 Drills ready.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
