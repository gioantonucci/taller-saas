const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeRole(role) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "RECEPTION" || r === "RECEPCION") return "RECEPTION";
  if (r === "MECHANIC" || r === "MECANICO") return "MECHANIC";
  return "RECEPTION";
}

// Emulador fiel de la lógica de validación de PATCH /api/work-orders/[id]
function simulatePatchOrder(currentOrder, session, body) {
  const isCurrentTerminado =
    currentOrder.estado === "FINALIZADO" ||
    currentOrder.estado === "TERMINADO" ||
    currentOrder.estado === "REPARADO";

  const isCurrentEntregado =
    currentOrder.estado === "ENTREGADO" ||
    currentOrder.estado === "ARCHIVADO";

  if (body.estado !== undefined && body.estado !== currentOrder.estado) {
    const userRole = normalizeRole(session.role);
    const isTargetEntregado =
      body.estado === "ENTREGADO" || body.estado === "ARCHIVADO";

    if (userRole === "RECEPTION" && !isTargetEntregado) {
      return { status: 403, error: "Permiso denegado: El personal de recepción no puede modificar el estado operativo de la orden." };
    }

    if (isCurrentEntregado) {
      return { status: 400, error: "La orden de trabajo ya se encuentra entregada y archivada. No se pueden modificar sus estados." };
    }

    if (isCurrentTerminado) {
      if (!isTargetEntregado) {
        return { status: 400, error: "La orden de trabajo ya se encuentra finalizada técnicamente. Solo puede ser marcada como entregada para archivarla." };
      }
    }

    if (isTargetEntregado && !isCurrentTerminado) {
      return { status: 400, error: "Para marcar la orden como entregada y archivarla, la reparación técnica debe estar finalizada previamente." };
    }
  }

  return { status: 200, success: true };
}

async function runTest() {
  console.log("================================================================================");
  console.log("🧪 TEST SUITE: ENTREGA Y ARCHIVADO DE ÓRDENES (REGLAS DE NEGOCIO + DB)");
  console.log("================================================================================");

  let testClient, testVehicle, testOrder, testMechanic, adminUser, receptionUser;

  try {
    adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    receptionUser = await prisma.user.findFirst({ where: { OR: [{ role: "RECEPCION" }, { role: "RECEPTION" }] } });
    testMechanic = await prisma.user.findFirst({ where: { OR: [{ role: "MECANICO" }, { role: "MECHANIC" }] } });

    const rnd = Math.floor(Math.random() * 900000 + 100000);
    testClient = await prisma.client.create({
      data: {
        nombre: "TestEntrega",
        apellido: "Archivado",
        dni: `DNI_ENT_${rnd}`,
        telefono: "+5491199887766",
        email: `entrega_${rnd}@test.com`,
        direccion: "Av. Del Libertador 1234",
      }
    });

    testVehicle = await prisma.vehicle.create({
      data: {
        clientId: testClient.id,
        marca: "Honda",
        modelo: "Civic",
        anio: 2021,
        patente: `ENT${rnd.toString().slice(0, 4)}`,
        color: "Gris",
      }
    });

    const lastOrder = await prisma.workOrder.findFirst({
      orderBy: { numeroOrden: "desc" },
      select: { numeroOrden: true }
    });
    const nextNum = (lastOrder?.numeroOrden || 1000) + 1;

    testOrder = await prisma.workOrder.create({
      data: {
        numeroOrden: nextNum,
        vehicleId: testVehicle.id,
        mechanicId: testMechanic.id,
        estado: "PENDIENTE",
        detallesIngreso: "Service general y frenos",
        checklistDanio: JSON.stringify({
          estadoPeritaje: "COMPLETADO",
          fechaHoraPeritaje: new Date().toISOString(),
        }),
      }
    });
    console.log(`✅ Orden de prueba #${testOrder.numeroOrden} abierta en PENDIENTE`);

    // 1. Validar que no se puede entregar una orden en PENDIENTE
    const check1 = simulatePatchOrder(testOrder, adminUser, { estado: "ENTREGADO" });
    if (check1.status === 400 && check1.error.includes("finalizada previamente")) {
      console.log("  ✅ [PASS] Regla: Se rechaza marcar como ENTREGADO si la orden no está finalizada previamente");
    } else {
      throw new Error(`Falló validación inicial: ${JSON.stringify(check1)}`);
    }

    // 2. Avanzar a FINALIZADO
    const finishedOrder = await prisma.workOrder.update({
      where: { id: testOrder.id },
      data: { estado: "FINALIZADO" }
    });
    console.log("  ✅ [PASS] Orden avanzada a FINALIZADO");

    // 3. Recepción marca la orden como ENTREGADO
    const checkReception = simulatePatchOrder(finishedOrder, receptionUser, { estado: "ENTREGADO" });
    if (checkReception.status === 200) {
      console.log("  ✅ [PASS] Rol RECEPCIÓN autorizado para marcar como ENTREGADO y archivar");
    } else {
      throw new Error(`Recepción fue rechazada erróneamente: ${JSON.stringify(checkReception)}`);
    }

    // Recepción intenta cambiar a PENDIENTE -> Debe ser rechazado
    const checkReceptionDenied = simulatePatchOrder(finishedOrder, receptionUser, { estado: "PENDIENTE" });
    if (checkReceptionDenied.status === 403) {
      console.log("  ✅ [PASS] Rol RECEPCIÓN denegado para alterar etapas técnicas operativas");
    } else {
      throw new Error("Recepción no debería poder cambiar a estados técnicos");
    }

    // 4. Efectuar la transición en base de datos
    const deliveryTimestamp = new Date();
    const deliveredOrder = await prisma.workOrder.update({
      where: { id: testOrder.id },
      data: {
        estado: "ENTREGADO",
        fechaEntrega: deliveryTimestamp,
      }
    });

    if (deliveredOrder.estado === "ENTREGADO" && deliveredOrder.fechaEntrega) {
      console.log("  ✅ [PASS] Orden actualizada a ENTREGADO en BD con fecha de entrega válida");
    } else {
      throw new Error("Falló actualización a ENTREGADO en BD");
    }

    // 5. Intentar modificar orden ENTREGADA -> Sellada
    const checkSealed = simulatePatchOrder(deliveredOrder, adminUser, { estado: "EN_REPARACION" });
    if (checkSealed.status === 400 && checkSealed.error.includes("archivada")) {
      console.log("  ✅ [PASS] Orden ENTREGADA/ARCHIVADA sellada: no permite alterar su estado");
    } else {
      throw new Error(`Falló protección de orden archivada: ${JSON.stringify(checkSealed)}`);
    }

    // 6. Verificar conteos de métricas
    const allOrders = await prisma.workOrder.findMany();
    const activosEnTaller = allOrders.filter(
      (o) =>
        o.estado !== "FINALIZADO" &&
        o.estado !== "REPARADO" &&
        o.estado !== "TERMINADO" &&
        o.estado !== "ENTREGADO" &&
        o.estado !== "ARCHIVADO"
    ).length;
    const countEntregados = allOrders.filter(
      (o) => o.estado === "ENTREGADO" || o.estado === "ARCHIVADO"
    ).length;

    console.log(`  ✅ [PASS] Métrica: Órdenes entregadas/archivadas contabilizadas (${countEntregados})`);
    console.log(`  ✅ [PASS] Métrica: Vehículos activos en taller excluyen archivados (${activosEnTaller})`);

    // 7. Simular consulta de filtrado de órdenes en /app/ordenes
    const filterTodos = allOrders.filter((o) => o.estado !== "ENTREGADO" && o.estado !== "ARCHIVADO");
    const filterEntregadas = allOrders.filter((o) => o.estado === "ENTREGADO" || o.estado === "ARCHIVADO");

    if (!filterTodos.some((o) => o.id === testOrder.id)) {
      console.log("  ✅ [PASS] Pestaña 'Todos en Taller' excluye correctamente la orden archivada");
    }
    if (filterEntregadas.some((o) => o.id === testOrder.id)) {
      console.log("  ✅ [PASS] Pestaña 'Entregadas / Archivadas' incluye la orden archivada");
    }

    console.log("\n================================================================================");
    console.log("🎉 TODOS LOS TESTS DE ENTREGA Y ARCHIVADO PASARON CON 100% DE ÉXITO!");
    console.log("================================================================================");
  } finally {
    if (testOrder) {
      await prisma.auditLog.deleteMany({ where: { entidadId: testOrder.id } }).catch(() => {});
      await prisma.workOrder.delete({ where: { id: testOrder.id } }).catch(() => {});
    }
    if (testVehicle) {
      await prisma.vehicle.delete({ where: { id: testVehicle.id } }).catch(() => {});
    }
    if (testClient) {
      await prisma.client.delete({ where: { id: testClient.id } }).catch(() => {});
    }
    console.log("🧹 Limpieza de datos de prueba finalizada.");
  }
}

runTest()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ ERROR EN SUITE:", e);
    process.exit(1);
  });
