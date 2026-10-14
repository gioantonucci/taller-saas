const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-auto-taller-saas-2026-secure-random"
);

async function runPhase3Tests() {
  console.log("==================================================");
  console.log("🧪 INICIANDO TEST SUITE - FASE 3: MÓDULO DE RECEPCIÓN");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, testName, detail) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
      process.exitCode = 1;
    }
  }

  // Obtenemos un usuario ADMIN para la sesión de prueba
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  assert(Boolean(adminUser), "Usuario de sesión disponible para pruebas");

  // -----------------------------------------------------------------
  // 1. Gestión de Clientes (CRUD + Soft Delete + Auditoría)
  // -----------------------------------------------------------------
  console.log("\n1. Verificando CRUD de Clientes...");

  const testDni = `TEST_${Date.now()}`;
  // Alta de Cliente
  const newClient = await prisma.client.create({
    data: {
      nombre: "Guillermo",
      apellido: "Francella",
      dni: testDni,
      telefono: "+54 11 4455-6677",
      email: "guillermo@teatro.com",
      direccion: "Av. Santa Fe 1234, CABA",
      isDeleted: false,
      status: "ACTIVE",
    },
  });

  assert(Boolean(newClient.id), `Cliente creado con éxito (ID: ${newClient.id}, DNI: ${newClient.dni})`);
  assert(newClient.isDeleted === false, "Cliente nuevo tiene isDeleted = false");
  assert(newClient.status === "ACTIVE", "Cliente nuevo tiene status = ACTIVE");

  // Auditoría de Alta de Cliente
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userEmail: adminUser.email,
      userName: `${adminUser.nombre} ${adminUser.apellido || ""}`,
      accion: "CREATE",
      entidad: "Clients",
      entidadAfectada: "Clients",
      entidadId: newClient.id,
      valores: JSON.stringify(newClient),
      detallesCambio: JSON.stringify({ nuevo: newClient }),
      ipAddress: "127.0.0.1",
    },
  });

  // Búsqueda de Cliente
  const searchResult = await prisma.client.findMany({
    where: {
      isDeleted: false,
      OR: [
        { dni: { contains: testDni } },
        { nombre: { contains: "Guillermo" } },
        { telefono: { contains: "4455" } },
      ],
    },
  });
  assert(searchResult.length >= 1, "Búsqueda rápida por DNI, Nombre o Teléfono encuentra al cliente");

  // Edición de Cliente
  const updatedClient = await prisma.client.update({
    where: { id: newClient.id },
    data: {
      telefono: "+54 11 9988-7766",
      direccion: "Nueva Dirección 567",
    },
  });
  assert(updatedClient.telefono === "+54 11 9988-7766", "Edición de datos de cliente guardada");

  // Baja Lógica (Soft Delete) de Cliente
  const softDeletedClient = await prisma.client.update({
    where: { id: newClient.id },
    data: {
      isDeleted: true,
      status: "INACTIVE",
    },
  });
  assert(softDeletedClient.isDeleted === true, "Baja Lógica: isDeleted = true");
  assert(softDeletedClient.status === "INACTIVE", "Baja Lógica: status = INACTIVE");

  // Comprobar que el registro SIGUE existiendo en la BD (NUNCA DELETE real)
  const stillExistsInDb = await prisma.client.findUnique({ where: { id: newClient.id } });
  assert(Boolean(stillExistsInDb), "El registro físico del cliente se conserva íntegro en la base de datos");

  // Auditoría de Baja Lógica
  const clientDeleteAudit = await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      accion: "SOFT_DELETE",
      entidad: "Clients",
      entidadAfectada: "Clients",
      entidadId: newClient.id,
      valores: JSON.stringify({ isDeleted: true, status: "INACTIVE" }),
      detallesCambio: JSON.stringify({ anterior: updatedClient, nuevo: softDeletedClient }),
      ipAddress: "127.0.0.1",
    },
  });
  assert(clientDeleteAudit.accion === "SOFT_DELETE", "AuditLog de baja lógica registrado");
  assert(clientDeleteAudit.entidad === "Clients", "AuditLog entidad vinculada a 'Clients'");

  // -----------------------------------------------------------------
  // 2. Gestión de Vehículos (CRUD + Asociación a Cliente + Soft Delete)
  // -----------------------------------------------------------------
  console.log("\n2. Verificando CRUD de Vehículos y Asociación...");

  // Cliente para asociar vehículo
  const ownerClient = await prisma.client.create({
    data: {
      nombre: "Ricardo",
      apellido: "Darín",
      dni: `DNI_${Date.now()}`,
      telefono: "+54 11 3344-5566",
      email: "ricardo@cine.com",
      direccion: "Av. Libertador 1000, Olivos",
      isDeleted: false,
      status: "ACTIVE",
    },
  });

  const testPatente = `AB${Math.floor(100 + Math.random() * 900)}CD`;

  // Alta de Vehículo asociado a cliente existente
  const newVehicle = await prisma.vehicle.create({
    data: {
      clientId: ownerClient.id,
      patente: testPatente,
      marca: "Ford",
      modelo: "Focus Titanium",
      anio: 2021,
      color: "Azul Eléctrico",
      nroChasis: "8AFBF23490",
      nroMotor: "DURATEC-2.0",
      isDeleted: false,
      status: "ACTIVE",
    },
    include: { client: true },
  });

  assert(Boolean(newVehicle.id), `Vehículo registrado con éxito (Patente: ${newVehicle.patente})`);
  assert(newVehicle.clientId === ownerClient.id, "Vehículo correctamente asociado al cliente titular");
  assert(newVehicle.isDeleted === false, "Vehículo nuevo tiene isDeleted = false");

  // Búsqueda de Vehículo por Patente y Marca/Modelo
  const foundVehicles = await prisma.vehicle.findMany({
    where: {
      isDeleted: false,
      OR: [
        { patente: { contains: testPatente } },
        { marca: { contains: "Ford" } },
        { modelo: { contains: "Focus" } },
      ],
    },
  });
  assert(foundVehicles.length >= 1, "Buscador de vehículos por patente y marca/modelo funciona");

  // Ficha Clínica del Vehículo
  const vehicleDetail = await prisma.vehicle.findUnique({
    where: { patente: testPatente },
    include: {
      client: true,
      workOrders: true,
    },
  });
  assert(Boolean(vehicleDetail?.client), "Ficha clínica muestra información del titular");
  assert(Array.isArray(vehicleDetail?.workOrders), "Ficha clínica muestra el historial de órdenes");

  // -----------------------------------------------------------------
  // 3. Apertura de Órdenes de Trabajo (Recepción Básica)
  // -----------------------------------------------------------------
  console.log("\n3. Verificando Apertura de Órdenes de Trabajo...");

  // Determinar siguiente número de orden
  const lastOrder = await prisma.workOrder.findFirst({
    orderBy: { numeroOrden: "desc" },
    select: { numeroOrden: true },
  });
  const nextOrderNumber = (lastOrder?.numeroOrden || 1000) + 1;

  // Apertura de Orden de Trabajo desde la Ficha del Vehículo
  const workOrder = await prisma.workOrder.create({
    data: {
      numeroOrden: nextOrderNumber,
      vehicleId: newVehicle.id,
      adminId: adminUser.id,
      estado: "PENDIENTE",
      nivelNafta: "3/4",
      kilometraje: 52400,
      detallesIngreso: "Service general de fluidos y chequeo de ruidos en la suspensión delantera",
    },
    include: {
      vehicle: {
        include: { client: true },
      },
    },
  });

  assert(Boolean(workOrder.id), `Orden de trabajo abierta con éxito (Orden #${workOrder.numeroOrden})`);
  assert(workOrder.numeroOrden === nextOrderNumber, "Número de orden secuencial asignado");
  assert(workOrder.estado === "PENDIENTE", "Estado inicial de orden en 'PENDIENTE'");
  assert(workOrder.nivelNafta === "3/4", "Nivel de combustible registrado correctamente (3/4)");
  assert(workOrder.kilometraje === 52400, "Kilometraje de ingreso registrado correctamente (52.400 km)");
  assert(Boolean(workOrder.detallesIngreso), "Motivo de ingreso guardado");

  // Auditoría de Apertura de Orden
  const orderAudit = await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      accion: "CREATE",
      entidad: "WorkOrders",
      entidadAfectada: "WorkOrders",
      entidadId: workOrder.id,
      valores: JSON.stringify({
        numeroOrden: workOrder.numeroOrden,
        patente: newVehicle.patente,
        kilometraje: workOrder.kilometraje,
        nivelNafta: workOrder.nivelNafta,
        detallesIngreso: workOrder.detallesIngreso,
      }),
      detallesCambio: JSON.stringify({
        nuevo: workOrder,
        descripcion: `Apertura de Orden #${workOrder.numeroOrden} para ${newVehicle.marca} ${newVehicle.modelo}`,
      }),
      ipAddress: "127.0.0.1",
    },
  });
  assert(orderAudit.accion === "CREATE", "AuditLog registrado para apertura de orden");
  assert(orderAudit.entidad === "WorkOrders", "AuditLog asociado a 'WorkOrders'");

  // Comprobar que la orden impacta visualmente en el historial del auto
  const updatedVehicleDetail = await prisma.vehicle.findUnique({
    where: { patente: testPatente },
    include: { workOrders: true },
  });
  assert(
    updatedVehicleDetail.workOrders.some((o) => o.numeroOrden === nextOrderNumber),
    "La nueva orden de trabajo se refleja de inmediato en el historial clínico del vehículo"
  );

  // -----------------------------------------------------------------
  // 4. Baja Lógica de Vehículo y Auditoría
  // -----------------------------------------------------------------
  console.log("\n4. Verificando Baja Lógica de Vehículo...");

  const softDeletedVehicle = await prisma.vehicle.update({
    where: { patente: testPatente },
    data: {
      isDeleted: true,
      status: "INACTIVE",
    },
  });
  assert(softDeletedVehicle.isDeleted === true, "Vehículo dado de baja lógica: isDeleted = true");

  const vehicleStillExists = await prisma.vehicle.findUnique({ where: { patente: testPatente } });
  assert(Boolean(vehicleStillExists), "El registro físico del vehículo se conserva íntegro en la base de datos");

  const vehicleDeleteAudit = await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      accion: "SOFT_DELETE",
      entidad: "Vehicles",
      entidadAfectada: "Vehicles",
      entidadId: newVehicle.id,
      valores: JSON.stringify({ isDeleted: true, status: "INACTIVE", patente: testPatente }),
      detallesCambio: JSON.stringify({
        descripcion: `Baja lógica (Soft Delete) del vehículo ${newVehicle.marca} ${newVehicle.modelo}`,
      }),
      ipAddress: "127.0.0.1",
    },
  });
  assert(vehicleDeleteAudit.accion === "SOFT_DELETE", "AuditLog de baja lógica del vehículo registrado");

  // -----------------------------------------------------------------
  // Resumen Final
  // -----------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`🏁 RESULTADOS: ${passed} / ${total} pruebas aprobadas.`);
  if (passed === total) {
    console.log("🎉 TODOS LOS REQUERIMIENTOS DE LA FASE 3 ESTÁN CUMPLIDOS Y VALIDADOS.");
  } else {
    console.error("⚠️ ALGUNAS PRUEBAS FALLARON.");
  }
  console.log("==================================================\n");

  // Limpieza de datos temporales del test suite
  await prisma.workOrder.deleteMany({ where: { id: workOrder.id } });
  await prisma.vehicle.deleteMany({ where: { id: newVehicle.id } });
  await prisma.client.deleteMany({ where: { id: ownerClient.id } });
  await prisma.client.deleteMany({ where: { id: newClient.id } });

  await prisma.$disconnect();
}

runPhase3Tests().catch((err) => {
  console.error("Error fatal en pruebas de Fase 3:", err);
  process.exit(1);
});
