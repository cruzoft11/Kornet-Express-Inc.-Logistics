import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeLogisticsData() {
  console.log('--- Wiping Operational Logistics Data ---');
  
  const shipments = await prisma.shipment.deleteMany({});
  console.log(`Deleted ${shipments.count} shipments`);

  const vehicles = await prisma.vehicle.deleteMany({});
  console.log(`Deleted ${vehicles.count} vehicles`);

  const pdOrders = await prisma.pdOrder.deleteMany({});
  console.log(`Deleted ${pdOrders.count} PD orders`);

  const dispatchRoutes = await prisma.dispatchRoute.deleteMany({});
  console.log(`Deleted ${dispatchRoutes.count} dispatch routes`);

  const checks = await prisma.checkDisbursement.deleteMany({});
  console.log(`Deleted ${checks.count} check disbursements`);

  const bridgeItems = await prisma.bridgeItem.deleteMany({});
  console.log(`Deleted ${bridgeItems.count} bridge items`);

  const tracking = await prisma.trackingItem.deleteMany({});
  console.log(`Deleted ${tracking.count} tracking items`);

  const auditLogs = await prisma.auditLog.deleteMany({});
  console.log(`Deleted ${auditLogs.count} audit logs`);

  console.log('--- Operational Logistics Data Wiped Clean ---');
}

wipeLogisticsData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
