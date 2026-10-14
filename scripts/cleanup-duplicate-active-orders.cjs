const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("=== Limpieza de órdenes duplicadas de pruebas para consistencia del negocio ===");

  // 1. PHASE5-TEST: dejar activa solo 9515, marcar 9510 y 9513 como ENTREGADO
  const phase5Updates = await prisma.workOrder.updateMany({
    where: {
      numeroOrden: { in: [9510, 9513] },
    },
    data: {
      estado: "ENTREGADO",
      fechaEntrega: new Date(),
    },
  });
  console.log(`PHASE5-TEST: ${phase5Updates.count} órdenes antiguas marcadas como ENTREGADO (9510, 9513).`);

  // 2. AF 142 XY: dejar activa 1001, marcar 1007, 9512, 9514 como ENTREGADO
  const afUpdates = await prisma.workOrder.updateMany({
    where: {
      numeroOrden: { in: [1007, 9512, 9514] },
    },
    data: {
      estado: "ENTREGADO",
      fechaEntrega: new Date(),
    },
  });
  console.log(`AF 142 XY: ${afUpdates.count} órdenes de pruebas marcadas como ENTREGADO (1007, 9512, 9514).`);

  // 3. AD 892 PL: dejar activa 1002, marcar 9511 como ENTREGADO
  const adUpdates = await prisma.workOrder.updateMany({
    where: {
      numeroOrden: { in: [9511] },
    },
    data: {
      estado: "ENTREGADO",
      fechaEntrega: new Date(),
    },
  });
  console.log(`AD 892 PL: ${adUpdates.count} órdenes de pruebas marcadas como ENTREGADO (9511).`);

  // Verificación final: ningún vehículo debe tener más de 1 orden activa
  const activeOrders = await prisma.workOrder.findMany({
    where: { estado: { notIn: ["ENTREGADO", "ARCHIVADO"] } },
    include: { vehicle: true },
  });

  const countByVehicle = {};
  for (const o of activeOrders) {
    countByVehicle[o.vehicle.patente] = (countByVehicle[o.vehicle.patente] || 0) + 1;
  }

  let duplicates = 0;
  for (const [patente, count] of Object.entries(countByVehicle)) {
    if (count > 1) {
      console.error(`ERROR: La patente ${patente} todavía tiene ${count} órdenes activas.`);
      duplicates++;
    }
  }

  if (duplicates === 0) {
    console.log("✔ Verificación exitosa: Ningún vehículo posee más de una orden activa simultánea en el taller.");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
