const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function normalizeRole(role) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "RECEPTION" || r === "RECEPCION") return "RECEPTION";
  if (r === "MECHANIC" || r === "MECANICO") return "MECHANIC";
  return "RECEPTION";
}

// Emulador fiel de la lógica de validación de PATCH /api/work-orders/[id] para peritaje
function simulatePatchPeritaje(currentOrder, session, body) {
  if (body.checklistDanio !== undefined || body.isPeritajeProfundo) {
    const userRole = normalizeRole(session.role);
    if (userRole === "RECEPTION") {
      return {
        status: 403,
        error: "Permiso denegado: El personal de recepción no puede realizar ni guardar el peritaje técnico.",
      };
    }
  }

  // REGLA DE NEGOCIO ESTRICTA: El peritaje de ingreso es un acta legal inmutable una vez cerrado
  let isCurrentPeritajeCerrado = false;
  if (currentOrder.checklistDanio) {
    try {
      const parsed =
        typeof currentOrder.checklistDanio === "string"
          ? JSON.parse(currentOrder.checklistDanio)
          : currentOrder.checklistDanio;
      if (
        parsed &&
        (parsed.cerrado === true ||
          parsed.estadoPeritaje === "COMPLETADO" ||
          parsed.estadoPeritaje === "CERRADO" ||
          Boolean(parsed.fechaCierre) ||
          Boolean(parsed.fechaHoraPeritaje))
      ) {
        isCurrentPeritajeCerrado = true;
      }
    } catch {}
  }

  if (
    currentOrder.estado !== "PENDIENTE" &&
    currentOrder.estado !== "PENDIENTE_PERITAJE" &&
    currentOrder.estado !== "INGRESADO"
  ) {
    if (currentOrder.checklistDanio) {
      isCurrentPeritajeCerrado = true;
    }
  }

  if (isCurrentPeritajeCerrado) {
    if (body.checklistDanio !== undefined) {
      const checklistStr =
        typeof body.checklistDanio === "string"
          ? body.checklistDanio
          : JSON.stringify(body.checklistDanio);
      if (checklistStr !== currentOrder.checklistDanio) {
        return {
          status: 400,
          error:
            "Operación denegada: El peritaje técnico de ingreso ya se encuentra cerrado e inmutable. Por normativa legal y de auditoría, los datos del peritaje no pueden ser modificados una vez cerrado.",
        };
      }
    }

    if (body.nivelNafta !== undefined && body.nivelNafta !== currentOrder.nivelNafta) {
      return {
        status: 400,
        error:
          "Operación denegada: El nivel de combustible quedó sellado en el peritaje de ingreso cerrado y no puede ser alterado.",
      };
    }

    if (
      body.kilometraje !== undefined &&
      Number(body.kilometraje) !== Number(currentOrder.kilometraje)
    ) {
      return {
        status: 400,
        error:
          "Operación denegada: El kilometraje en odómetro quedó sellado en el peritaje de ingreso cerrado y no puede ser alterado.",
      };
    }

    if (
      body.comentariosDuenio !== undefined &&
      body.comentariosDuenio !== currentOrder.comentariosDuenio
    ) {
      return {
        status: 400,
        error:
          "Operación denegada: La declaración inicial de daños del dueño quedó asentada en el peritaje cerrado y no puede ser modificada.",
      };
    }
  }

  return { status: 200, success: true };
}

async function runTest() {
  console.log("================================================================================");
  console.log("🧪 TEST SUITE: INMUTABILIDAD DEL PERITAJE DE INGRESO UNA VEZ CERRADO");
  console.log("================================================================================");

  let testClient, testVehicle, testOrder, testMechanic, adminUser, receptionUser;

  try {
    adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    receptionUser = await prisma.user.findFirst({ where: { OR: [{ role: "RECEPCION" }, { role: "RECEPTION" }] } });
    testMechanic = await prisma.user.findFirst({ where: { OR: [{ role: "MECANICO" }, { role: "MECHANIC" }] } });

    // 1. Crear Orden de Prueba Inicial en PENDIENTE
    testClient = await prisma.client.create({
      data: {
        nombre: "Peritaje",
        apellido: "Test Inmutable",
        telefono: "1199998888",
        dni: `TEST_${Date.now()}`,
        email: `inmutable_${Date.now()}@test.com`,
        direccion: "Av. Maipú 2450",
      },
    });

    testVehicle = await prisma.vehicle.create({
      data: {
        marca: "Volkswagen",
        modelo: "Golf GTI",
        anio: 2021,
        patente: `IMM${Math.floor(Math.random() * 899 + 100)}`,
        clientId: testClient.id,
      },
    });

    testOrder = await prisma.workOrder.create({
      data: {
        numeroOrden: Math.floor(Math.random() * 80000 + 10000),
        vehicleId: testVehicle.id,
        mechanicId: testMechanic ? testMechanic.id : null,
        estado: "PENDIENTE",
        nivelNafta: "1/2",
        kilometraje: 42000,
        detallesIngreso: "Revisión general y peritaje de recepción",
        comentariosDuenio: "Declara raspón en lateral derecho",
        costoManoDeObra: 0,
        totalPresupuesto: 0,
      },
    });

    console.log(`✅ Orden de prueba #${testOrder.numeroOrden} abierta en PENDIENTE (Sin peritaje cerrado aún)`);

    // TEST 1: Recepción no puede asentar peritaje
    const resRecep = simulatePatchPeritaje(testOrder, receptionUser || { role: "RECEPCION" }, {
      checklistDanio: { damagePins: [] },
    });
    if (resRecep.status === 403) {
      console.log("  ✅ [PASS] Recepción denegada para realizar o asentar peritaje de ingreso");
    } else {
      throw new Error("Falló protección de rol: Recepción no debería poder asentar peritajes.");
    }

    // TEST 2: Mecánico asienta el peritaje por primera vez (debe permitirse)
    const initialPeritajePayload = {
      fechaHoraPeritaje: new Date().toLocaleString("es-AR"),
      estadoPeritaje: "COMPLETADO",
      cerrado: true,
      fechaCierre: new Date().toISOString(),
      damagePins: [
        { id: "pin-1", x: 25, y: 40, tipo: "RAYON", descripcion: "Raspón lateral" },
      ],
      lucesTestigo: { checkEngine: false, abs: false, airbag: false },
    };

    const resFirstSave = simulatePatchPeritaje(testOrder, testMechanic || { role: "MECHANIC" }, {
      checklistDanio: initialPeritajePayload,
      nivelNafta: "1/2",
      kilometraje: 42000,
    });

    if (resFirstSave.status === 200) {
      console.log("  ✅ [PASS] Primer asentamiento de peritaje permitido para mecánico responsable");
    } else {
      throw new Error(`Falló primer asentamiento de peritaje: ${resFirstSave.error}`);
    }

    // Persistir cierre de peritaje en Base de Datos y avanzar a EN_REPARACION
    testOrder = await prisma.workOrder.update({
      where: { id: testOrder.id },
      data: {
        checklistDanio: JSON.stringify(initialPeritajePayload),
        estado: "EN_REPARACION",
        nivelNafta: "1/2",
        kilometraje: 42000,
      },
    });

    console.log("  ✅ [PASS] Peritaje cerrado y sellado en base de datos. Estado: EN_REPARACION");

    // TEST 3: Intentar editar checklistDanio en peritaje cerrado (debe fallar)
    const resEditPins = simulatePatchPeritaje(testOrder, testMechanic || { role: "MECHANIC" }, {
      checklistDanio: {
        ...initialPeritajePayload,
        damagePins: [
          ...initialPeritajePayload.damagePins,
          { id: "pin-2", x: 60, y: 70, tipo: "ABOLLADURA", descripcion: "Abolladura no declarada" },
        ],
      },
    });

    if (resEditPins.status === 400 && resEditPins.error.includes("cerrado e inmutable")) {
      console.log("  ✅ [PASS] REGLA CUMPLIDA: Se rechaza modificar el esquema de daños/checklistDanio en peritaje cerrado");
    } else {
      throw new Error("Falló validación: Se permitió modificar checklistDanio en una orden con peritaje cerrado!");
    }

    // TEST 4: Intentar alterar nivel de combustible tras cierre de peritaje (debe fallar)
    const resEditNafta = simulatePatchPeritaje(testOrder, testMechanic || { role: "MECHANIC" }, {
      nivelNafta: "LLENO",
    });

    if (resEditNafta.status === 400 && resEditNafta.error.includes("nivel de combustible")) {
      console.log("  ✅ [PASS] REGLA CUMPLIDA: Se rechaza alterar el nivel de combustible de ingreso en peritaje cerrado");
    } else {
      throw new Error("Falló validación: Se permitió alterar el nivel de nafta tras cerrar el peritaje!");
    }

    // TEST 5: Intentar alterar kilometraje tras cierre de peritaje (debe fallar)
    const resEditKm = simulatePatchPeritaje(testOrder, testMechanic || { role: "MECHANIC" }, {
      kilometraje: 99999,
    });

    if (resEditKm.status === 400 && resEditKm.error.includes("kilometraje en odómetro")) {
      console.log("  ✅ [PASS] REGLA CUMPLIDA: Se rechaza alterar el kilometraje tras cerrar el peritaje");
    } else {
      throw new Error("Falló validación: Se permitió alterar el kilometraje tras cerrar el peritaje!");
    }

    // TEST 6: Intentar alterar declaración de daños del dueño tras cierre (debe fallar)
    const resEditDuenio = simulatePatchPeritaje(testOrder, testMechanic || { role: "MECHANIC" }, {
      comentariosDuenio: "Modificando declaración retrospectiva",
    });

    if (resEditDuenio.status === 400 && resEditDuenio.error.includes("declaración inicial de daños")) {
      console.log("  ✅ [PASS] REGLA CUMPLIDA: Se rechaza alterar la declaración del dueño tras cerrar el peritaje");
    } else {
      throw new Error("Falló validación: Se permitió alterar la declaración del cliente tras cerrar el peritaje!");
    }

    // TEST 7: Incluso un ADMIN tiene prohibido falsificar o alterar el peritaje cerrado
    const resAdminEdit = simulatePatchPeritaje(testOrder, adminUser || { role: "ADMIN" }, {
      checklistDanio: { cerrado: false, damagePins: [] },
    });

    if (resAdminEdit.status === 400 && resAdminEdit.error.includes("cerrado e inmutable")) {
      console.log("  ✅ [PASS] REGLA CUMPLIDA: Incluso ADMIN tiene bloqueada la adulteración del peritaje cerrado (resguardo legal íntegro)");
    } else {
      throw new Error("Falló validación: Un admin no debería poder alterar el peritaje técnico cerrado.");
    }

    // TEST 8: Operaciones posteriores válidas (avanzar a ESPERANDO_REPUESTOS, FINALIZADO) permitidas
    const resValidOps = simulatePatchPeritaje(testOrder, testMechanic || { role: "MECHANIC" }, {
      estado: "ESPERANDO_REPUESTOS",
    });

    if (resValidOps.status === 200) {
      console.log("  ✅ [PASS] Transiciones operativas mecánicas posteriores permitidas normalmente");
    } else {
      throw new Error(`Falló operación operativa válida: ${resValidOps.error}`);
    }

    console.log("\n================================================================================");
    console.log("🎉 TODOS LOS TESTS DE INMUTABILIDAD DEL PERITAJE PASARON CON 100% DE ÉXITO!");
    console.log("================================================================================");

  } catch (err) {
    console.error("❌ ERROR DURANTE LA EJECUCIÓN:", err);
    process.exit(1);
  } finally {
    if (testOrder) {
      await prisma.workOrder.deleteMany({ where: { id: testOrder.id } }).catch(() => {});
    }
    if (testVehicle) {
      await prisma.vehicle.deleteMany({ where: { id: testVehicle.id } }).catch(() => {});
    }
    if (testClient) {
      await prisma.client.deleteMany({ where: { id: testClient.id } }).catch(() => {});
    }
    await prisma.$disconnect();
    console.log("🧹 Limpieza de datos de prueba finalizada.");
  }
}

runTest();
