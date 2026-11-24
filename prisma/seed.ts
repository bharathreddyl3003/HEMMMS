import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting full fleet seeding (12 Shovels & 5 Drills)...')

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

  // 3. Drills Fleet (5 Units)
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

  // 4. Seed Shovels Fleet (12 Units matching RGOCP2 Fleet Overview Register)
  const shovels = [
    // 4 nos Tata Hitachi EX1200 5 CuM Shovels (Interval: 500h)
    {
      name: 'T2',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 33205.0,
      lastHmr: 32822.0,
      interval: 500,
      serialNumber: 'TH-EX1200-02',
      commissioningDate: new Date('2017-01-12')
    },
    {
      name: 'T3',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 31629.0,
      lastHmr: 31582.0,
      interval: 500,
      serialNumber: 'TH-EX1200-03',
      commissioningDate: new Date('2017-05-18')
    },
    {
      name: 'T5',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 40906.0,
      lastHmr: 40683.0,
      interval: 500,
      serialNumber: 'TH-EX1200-05',
      commissioningDate: new Date('2016-02-22')
    },
    {
      name: 'T6',
      model: 'EX1200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 38401.0,
      lastHmr: 38401.0,
      interval: 500,
      serialNumber: 'TH-EX1200-06',
      commissioningDate: new Date('2016-08-14')
    },
    // 4 nos BEML Make BE-1000 Model 6.5 CuM Shovels (Interval: 250h)
    {
      name: 'B1',
      model: 'BE1000-1',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 6756.0,
      lastHmr: 6727.0,
      interval: 250,
      serialNumber: 'BE1000-01',
      commissioningDate: new Date('2018-03-15')
    },
    {
      name: 'B2',
      model: 'BE1000-1',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 6693.0,
      lastHmr: 6532.0,
      interval: 250,
      serialNumber: 'BE1000-02',
      commissioningDate: new Date('2018-07-20')
    },
    {
      name: 'B3',
      model: 'BE1000-1',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 6721.0,
      lastHmr: 6721.0,
      interval: 250,
      serialNumber: 'BE1000-03',
      commissioningDate: new Date('2017-11-10')
    },
    {
      name: 'B18',
      model: 'BE1000-1',
      category: 'Shovel',
      make: 'BEML',
      capacity: '6.5 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 7011.0,
      lastHmr: 6939.0,
      interval: 250,
      serialNumber: 'BE1000-18',
      commissioningDate: new Date('2019-09-05')
    },
    // S2, S6: EX200 1 m³ (Interval: 500h)
    {
      name: 'S2',
      model: 'EX200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '1 m³',
      type: 'Hydraulic Shovel',
      status: 'Under Maintenance',
      runningHours: 19260.0,
      lastHmr: 18690.0,
      interval: 500,
      serialNumber: 'EX200-02',
      commissioningDate: new Date('2015-06-10')
    },
    {
      name: 'S6',
      model: 'EX200',
      category: 'Shovel',
      make: 'Tata Hitachi',
      capacity: '1 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 283.0,
      lastHmr: 0.0,
      interval: 500,
      serialNumber: 'EX200-06',
      commissioningDate: new Date('2024-01-15')
    },
    // S3: Komatsu PC450LC 3 m³ (Interval: 250h)
    {
      name: 'S3',
      model: 'PC450LC',
      category: 'Shovel',
      make: 'Komatsu',
      capacity: '3 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 18399.0,
      lastHmr: 18358.0,
      interval: 250,
      serialNumber: 'KOM-PC450-03',
      commissioningDate: new Date('2021-04-10')
    },
    // S5: SANY SY210C-9 0.9 m³ (Interval: 500h)
    {
      name: 'S5',
      model: 'SY210C-9',
      category: 'Shovel',
      make: 'SANY',
      capacity: '0.9 m³',
      type: 'Hydraulic Shovel',
      status: 'Working',
      runningHours: 5399.0,
      lastHmr: 5010.0,
      interval: 500,
      serialNumber: 'SANY-SY210-05',
      commissioningDate: new Date('2022-09-18')
    }
  ]

  for (const shovel of shovels) {
    let machine = await prisma.machine.findFirst({
      where: { name: shovel.name },
    })

    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          name: shovel.name,
          model: shovel.model,
          category: shovel.category,
          make: shovel.make,
          capacity: shovel.capacity,
          type: shovel.type,
          status: shovel.status,
          runningHours: shovel.runningHours,
          serialNumber: shovel.serialNumber,
          commissioningDate: shovel.commissioningDate,
          subassemblies: {
            create: [
              { name: 'Engine / Prime Mover', lifeExpectancyHours: 10000, currentHours: 2200, healthStatus: 'Good' },
              { name: 'Hydraulic System & Pumps', lifeExpectancyHours: 6000, currentHours: 1800, healthStatus: 'Good' },
              { name: 'Swing Device & Machinery', lifeExpectancyHours: 8000, currentHours: 2400, healthStatus: 'Good' },
              { name: `Attachment (Boom, Arm, ${shovel.capacity} Bucket)`, lifeExpectancyHours: 7000, currentHours: 1900, healthStatus: 'Good' },
              { name: 'Undercarriage & Tracks', lifeExpectancyHours: 5000, currentHours: 3500, healthStatus: 'Warning' },
            ],
          },
          scheduledMaintenances: {
            create: [
              { type: 'Engine', intervalHrs: shovel.interval, lastMaintenanceHmr: shovel.lastHmr },
              { type: 'Hydraulic', intervalHrs: 1000, lastMaintenanceHmr: shovel.lastHmr },
            ],
          },
        },
      })
      console.log(`Created shovel: ${machine.name} (${machine.model} - ${machine.capacity})`)
    } else {
      await prisma.machine.update({
        where: { id: machine.id },
        data: {
          model: shovel.model,
          category: 'Shovel',
          make: shovel.make,
          capacity: shovel.capacity,
          type: shovel.type,
          runningHours: shovel.runningHours,
          status: shovel.status
        }
      })

      // Update or upsert scheduled maintenance to match lastHmr
      await prisma.scheduledMaintenance.upsert({
        where: { machineId_type: { machineId: machine.id, type: 'Engine' } },
        update: {
          intervalHrs: shovel.interval,
          lastMaintenanceHmr: shovel.lastHmr
        },
        create: {
          machineId: machine.id,
          type: 'Engine',
          intervalHrs: shovel.interval,
          lastMaintenanceHmr: shovel.lastHmr
        }
      })
      console.log(`Updated shovel: ${shovel.name} (${shovel.model})`)
    }
  }

  // 5. Seed Historical Maintenance Completion Registry (from Page 2 of design document)
  const completions = [
    { shovelName: 'B3', model: 'BE1000-1', lastHmr: 6721.0, currentHmr: 6721.0, interval: 250, fitter: 'Asari Mahesh', date: '2026-11-22T11:13:00Z' },
    { shovelName: 'B3', model: 'BE1000-1', lastHmr: 6715.0, currentHmr: 6721.0, interval: 250, fitter: 'Asari Mahesh', date: '2026-11-22T11:13:00Z' },
    { shovelName: 'T6', model: 'EX1200', lastHmr: 37937.0, currentHmr: 38401.0, interval: 500, fitter: 'Raj kumar', date: '2026-11-22T11:09:00Z' },
    { shovelName: 'B3', model: 'BE1000-1', lastHmr: 6451.0, currentHmr: 6715.0, interval: 250, fitter: 'Asari Mahesh', date: '2026-11-22T11:06:00Z' },
    { shovelName: 'B1', model: 'BE1000-1', lastHmr: 6727.0, currentHmr: 6727.0, interval: 250, fitter: 'Asari Mahesh', date: '2026-11-20T18:15:00Z' },
    { shovelName: 'B1', model: 'BE1000-1', lastHmr: 6442.0, currentHmr: 6727.0, interval: 250, fitter: 'Asari Mahesh', date: '2026-11-20T14:13:00Z' },
    { shovelName: 'T3', model: 'EX1200', lastHmr: 31158.0, currentHmr: 31690.0, interval: 500, fitter: 'Mande srinivast', date: '2026-11-19T13:26:00Z' },
    { shovelName: 'B18', model: 'BE1000-1', lastHmr: 6672.0, currentHmr: 6939.0, interval: 250, fitter: 'Mande Srinivas', date: '2026-11-18T11:17:00Z' },
    { shovelName: 'T5', model: 'EX1200', lastHmr: 40170.0, currentHmr: 40683.0, interval: 500, fitter: 'M Narsingam', date: '2026-11-06T09:25:00Z' },
    { shovelName: 'B1', model: 'BE1000-1', lastHmr: 6192.0, currentHmr: 6487.0, interval: 250, fitter: 'M Narsingam', date: '2026-11-06T06:19:00Z' },
    { shovelName: 'B3', model: 'BE1000-1', lastHmr: 6190.0, currentHmr: 6451.0, interval: 250, fitter: 'Asari Mahesh', date: '2026-11-05T18:21:00Z' },
    { shovelName: 'B2', model: 'BE1000-1', lastHmr: 6235.0, currentHmr: 6532.0, interval: 250, fitter: 'Mande Srinivas', date: '2026-11-05T18:20:00Z' },
    { shovelName: 'B2', model: 'BE1000-1', lastHmr: 6235.0, currentHmr: 6532.0, interval: 250, fitter: 'Mande Srinivas', date: '2026-11-05T18:18:00Z' }
  ]

  for (const c of completions) {
    const machine = await prisma.machine.findFirst({ where: { name: c.shovelName } })
    if (machine) {
      const existing = await prisma.maintenanceRecord.findFirst({
        where: {
          machineId: machine.id,
          hmr: c.currentHmr,
          performedBy: c.fitter
        }
      })
      if (!existing) {
        await prisma.maintenanceRecord.create({
          data: {
            machineId: machine.id,
            description: `Scheduled Service (${c.interval}h Interval Completed)`,
            logType: 'Scheduled Maintenance',
            subassemblyName: 'Engine',
            hmr: c.currentHmr,
            status: 'Completed',
            performedBy: c.fitter,
            timeSpentHrs: 2.5,
            createdAt: new Date(c.date)
          }
        })
      }
    }
  }

  console.log('Seeding finished successfully! All 12 Shovels, 5 Drills, and Completion Registry seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
