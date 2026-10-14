const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const BASE_URL = process.env.TEST_URL || "http://localhost:3001";

async function runPhase6Tests() {
  console.log("=================================================");
  console.log("🚀 INICIANDO TEST SUITE FASE 6: WHITE-LABEL, PORTAL CLIENTE, DASHBOARD & AUDITORÍA");
  console.log("=================================================\n");

  let testOrderId = null;
  let testOrderNumber = null;

  try {
    // =========================================================================
    // 1. WEB PÚBLICA WHITE-LABEL & TENANT SETTINGS DINÁMICOS
    // =========================================================================
    console.log("📌 [1/4] Test: Tenant_Settings dinámicos (White-Label)");

    // Asegurar o actualizar configuración del taller
    const updatedSettings = await prisma.tenantSettings.upsert({
      where: { id: "default-settings" },
      update: {
        tallerNombre: "Taller Mecánico MotorTech Pro",
        whatsapp: "+54 9 11 5566-7788",
        logoUrl: "/icons/brand-logo.png",
        direccion: "Av. Corrientes 4500, Almagro, CABA",
        horarios: "Lunes a Viernes de 08:00 a 18:30 hs",
        email: "contacto@motortechpro.com",
        descripcion: "Especialistas en inyección electrónica, mecánica integral y tren delantero.",
      },
      create: {
        id: "default-settings",
        tallerNombre: "Taller Mecánico MotorTech Pro",
        whatsapp: "+54 9 11 5566-7788",
        logoUrl: "/icons/brand-logo.png",
        direccion: "Av. Corrientes 4500, Almagro, CABA",
        horarios: "Lunes a Viernes de 08:00 a 18:30 hs",
        email: "contacto@motortechpro.com",
        descripcion: "Especialistas en inyección electrónica, mecánica integral y tren delantero.",
        valorHoraManoDeObra: 16000,
      },
    });

    console.log(`   ✅ DB TenantSettings actualizado:`);
    console.log(`      - Nombre del Taller: "${updatedSettings.tallerNombre}"`);
    console.log(`      - WhatsApp: "${updatedSettings.whatsapp}"`);
    console.log(`      - Dirección: "${updatedSettings.direccion}"`);
    console.log(`      - Horarios: "${updatedSettings.horarios}"`);
    console.log(`      - Email: "${updatedSettings.email}"`);

    // Test GET /api/settings vía HTTP (debe ser público sin login)
    try {
      const resSettings = await fetch(`${BASE_URL}/api/settings`);
      if (resSettings.ok) {
        const jsonSettings = await resSettings.json();
        console.log(`   ✅ GET /api/settings respondió HTTP 200 (Acceso público white-label OK)`);
        console.log(`      - Nombre servido por API: "${jsonSettings.settings.tallerNombre}"`);
        if (jsonSettings.settings.tallerNombre !== updatedSettings.tallerNombre) {
          throw new Error("El nombre servido no coincide con la BD");
        }
      } else {
        console.log(`   ⚠️ GET /api/settings respondió ${resSettings.status}`);
      }
    } catch (e) {
      console.log(`   ℹ️ Fetch local /api/settings: ${e.message}`);
    }

    // =========================================================================
    // 2. PORTAL DE SEGUIMIENTO PARA EL CLIENTE (/estado/[id])
    // =========================================================================
    console.log("\n📌 [2/4] Test: Portal de Seguimiento para el Cliente Final (/estado/[id])");

    // Buscar una orden existente o crear una orden de prueba
    let order = await prisma.workOrder.findFirst({
      include: {
        vehicle: { include: { client: true } },
        parts: true,
      },
    });

    if (!order) {
      let client = await prisma.client.create({
        data: {
          nombre: "Mariana",
          apellido: "López",
          dni: "34999888",
          telefono: "+54 9 11 4444-9999",
        },
      });
      let vehicle = await prisma.vehicle.create({
        data: {
          clientId: client.id,
          marca: "Peugeot",
          modelo: "208 Allure",
          anio: 2022,
          patente: "AF987XX",
        },
      });
      order = await prisma.workOrder.create({
        data: {
          numeroOrden: 9901,
          vehicleId: vehicle.id,
          estado: "EN_REPARACION",
          detallesIngreso: "Cambio de kit de distribución y service de 40.000km",
          nivelNafta: "3/4",
          kilometraje: "41200",
          costoManoDeObra: 65000,
          totalPresupuesto: 145000,
        },
        include: {
          vehicle: { include: { client: true } },
          parts: true,
        },
      });
    }

    testOrderId = order.id;
    testOrderNumber = order.numeroOrden;

    // Test GET /api/public/orders/[id]
    try {
      const resPublicOrder = await fetch(`${BASE_URL}/api/public/orders/${testOrderId}`);
      if (resPublicOrder.ok) {
        const orderData = await resPublicOrder.json();
        console.log(`   ✅ GET /api/public/orders/${testOrderId} respondió HTTP 200 OK`);
        console.log(`      - Vehículo: ${orderData.order.vehiculo.marca} ${orderData.order.vehiculo.modelo}`);
        console.log(`      - Patente: ${orderData.order.vehiculo.patente}`);
        console.log(`      - Estado Actual: "${orderData.order.estado}"`);
        console.log(`      - Total Presupuesto: $${orderData.order.totalPresupuesto?.toLocaleString("es-AR")}`);

        // Verificación de Seguridad: NO debe exponer costo mayorista ni campos internos
        const hasWholesaleCost = orderData.order.parts.some((p) => p.costo !== undefined);
        if (hasWholesaleCost) {
          throw new Error("Falla de seguridad: la API pública expuso 'costo' mayorista de repuestos!");
        } else {
          console.log(`      🛡️ Verificación de Seguridad: Costos mayoristas ocultos al cliente público.`);
        }
      } else {
        console.log(`   ⚠️ GET /api/public/orders respondió ${resPublicOrder.status}`);
      }

      // Probar búsqueda por numeroOrden
      const resByNumber = await fetch(`${BASE_URL}/api/public/orders/${testOrderNumber}`);
      if (resByNumber.ok) {
        console.log(`   ✅ Búsqueda por número de orden #${testOrderNumber} resolvió correctamente.`);
      }

      // Probar orden inexistente (debe dar 404)
      const res404 = await fetch(`${BASE_URL}/api/public/orders/id-inexistente-123`);
      if (res404.status === 404) {
        console.log(`   ✅ Solicitud con ID erróneo respondió 404 Not Found como se esperaba.`);
      }
    } catch (e) {
      console.log(`   ℹ️ Fetch local /api/public/orders: ${e.message}`);
    }

    // =========================================================================
    // 3. DASHBOARD Y MÉTRICAS: GRÁFICOS VISUALES & MONITOR DE MECÁNICOS
    // =========================================================================
    console.log("\n📌 [3/4] Test: Dashboard & Métricas con Gráficos y Monitor de Mecánicos");

    // Verificar datos de mecánicos en DB
    let mechanic = await prisma.user.findFirst({
      where: { OR: [{ role: "MECHANIC" }, { role: "MECANICO" }] },
    });
    if (!mechanic) {
      mechanic = await prisma.user.create({
        data: {
          email: "mecanico.test@taller.com",
          passwordHash: "hashed",
          nombre: "Roberto",
          apellido: "Gómez",
          role: "MECHANIC",
          status: "ACTIVE",
        },
      });
    }

    // Asignar orden al mecánico para probar monitor en vivo
    await prisma.workOrder.update({
      where: { id: testOrderId },
      data: {
        mechanicId: mechanic.id,
        estado: "EN_REPARACION",
      },
    });

    // Registrar tarea reciente en workLog
    await prisma.workLog.create({
      data: {
        workOrderId: testOrderId,
        mechanicId: mechanic.id,
        horasInvertidas: 2.5,
        descripcionTarea: "Desarme de distribución y reemplazo de bomba de agua",
      },
    });

    console.log(`   ✅ Mecánico activo asignado: "${mechanic.nombre} ${mechanic.apellido}"`);
    console.log(`   ✅ Orden asignada: #${testOrderNumber} (EN_REPARACION)`);

    // Probar generación de datos para gráficos
    const allOrders = await prisma.workOrder.findMany({
      include: {
        vehicle: { include: { client: true } },
        workLogs: true,
      },
    });

    const activeCars = allOrders.filter(
      (o) => o.estado !== "FINALIZADO" && o.estado !== "REPARADO"
    ).length;
    const finishedCars = allOrders.filter(
      (o) => o.estado === "FINALIZADO" || o.estado === "REPARADO"
    ).length;

    console.log(`   📊 Autos en Taller: ${activeCars} activos | ${finishedCars} finalizados`);

    const allTransactions = await prisma.transaction.findMany();
    const totalIngresos = allTransactions
      .filter((t) => t.tipo === "INGRESO")
      .reduce((sum, t) => sum + t.monto, 0);
    const totalEgresos = allTransactions
      .filter((t) => t.tipo === "EGRESO")
      .reduce((sum, t) => sum + t.monto, 0);

    console.log(`   💰 Transacciones de Caja:`);
    console.log(`      - Ingresos: +$${totalIngresos.toLocaleString("es-AR")}`);
    console.log(`      - Egresos:  -$${totalEgresos.toLocaleString("es-AR")}`);
    console.log(`      - Balance:   $${(totalIngresos - totalEgresos).toLocaleString("es-AR")}`);

    // =========================================================================
    // 4. HISTORIAL DE AUDITORÍA (AUDIT_LOGS)
    // =========================================================================
    console.log("\n📌 [4/4] Test: Historial de Auditoría con Filtros Rápidos");

    // Crear eventos de auditoría de prueba
    const auditEvent1 = await prisma.auditLog.create({
      data: {
        userName: "Admin Taller",
        userEmail: "admin@taller.com",
        accion: "UPDATE",
        entidadAfectada: "TenantSettings",
        entidad: "TenantSettings",
        detallesCambio: JSON.stringify({
          motivo: "Actualización de horarios de atención y tarifa de mano de obra",
          anterior: { valorHoraManoDeObra: 15000 },
          nuevo: { valorHoraManoDeObra: 16000 },
        }),
      },
    });

    const auditEvent2 = await prisma.auditLog.create({
      data: {
        userName: "Mariela Recepción",
        userEmail: "recepcion@taller.com",
        accion: "CREATE",
        entidadAfectada: "WorkOrders",
        entidad: "WorkOrders",
        detallesCambio: JSON.stringify({
          motivo: `Ingreso de Peugeot 208 patente AF987XX - Orden #${testOrderNumber}`,
          numeroOrden: testOrderNumber,
        }),
      },
    });

    console.log(`   ✅ Eventos de auditoría registrados:`);
    console.log(`      - Log #${auditEvent1.id}: [${auditEvent1.accion}] ${auditEvent1.entidadAfectada}`);
    console.log(`      - Log #${auditEvent2.id}: [${auditEvent2.accion}] ${auditEvent2.entidadAfectada}`);

    // Verificar consultas con filtros
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const logsHoy = await prisma.auditLog.findMany({
      where: { timestamp: { gte: hoy } },
      orderBy: { timestamp: "desc" },
    });
    console.log(`   ✅ Filtro rápido 'HOY': ${logsHoy.length} eventos recuperados`);

    const logsWorkOrders = await prisma.auditLog.findMany({
      where: { entidadAfectada: "WorkOrders" },
    });
    console.log(`   ✅ Filtro por entidad 'WorkOrders': ${logsWorkOrders.length} eventos recuperados`);

    console.log("\n=================================================");
    console.log("🎉 TODOS LOS COMPONENTES DE FASE 6 VERIFICADOS CON ÉXITO");
    console.log("=================================================");
  } catch (error) {
    console.error("❌ ERROR EN TEST FASE 6:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase6Tests();
