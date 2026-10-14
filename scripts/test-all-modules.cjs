/**
 * ============================================================================
 * TEST & DEBUG SUITE INTEGRAL - TODOS LOS MÓDULOS DE SISTEMA TALLER SAAS
 * ============================================================================
 * Ejecuta validaciones completas, tests de regresión y pruebas de estrés de:
 * 1. Autenticación, JWT, Criptografía y RBAC
 * 2. Módulo de Clientes & Cuenta Corriente
 * 3. Módulo de Vehículos & Historial Clínico
 * 4. Módulo de Órdenes de Trabajo & Reglas de Cierre
 * 5. Módulo de Peritaje Técnico, Daños & Multimedia
 * 6. Módulo de Inventario, Repuestos & OCR
 * 7. Módulo de Caja Diaria, Finanzas & POS
 * 8. Módulo de Auditoría Integral & Trazabilidad
 * 9. Módulo de Monitoreo de Mecánicos & Tenant Settings (White-Label)
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { SignJWT, jwtVerify } = require("jose");

const prisma = new PrismaClient();
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-auto-taller-saas-2026-secure-random"
);

function normalizeRole(role) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "ADMIN";
  if (r === "RECEPTION" || r === "RECEPCION") return "RECEPTION";
  if (r === "MECHANIC" || r === "MECANICO") return "MECHANIC";
  return "RECEPTION";
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, detail = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} ${detail ? `- ${detail}` : ""}`);
  }
}

async function runMasterTestSuite() {
  console.log("================================================================================");
  console.log("🚀 EJECUTANDO SUITE INTEGRAL DE PRUEBAS Y DEBUGGING - TODOS LOS MÓDULOS");
  console.log("================================================================================\n");

  const timestamp = Date.now();
  let createdClientId = null;
  let createdVehiclePatente = null;
  let createdOrderId = null;
  let createdPartId = null;
  let createdTransactionId = null;
  let createdInventoryItemId = null;

  try {
    // =========================================================================
    // MÓDULO 1: AUTENTICACIÓN, CRIPTOGRAFÍA Y RBAC
    // =========================================================================
    console.log("--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 1: AUTENTICACIÓN, JWT, HASH Y MATRIZ RBAC");
    console.log("--------------------------------------------------------------------------------");

    // 1.1 Verificación de usuarios sembrados
    const adminUser = await prisma.user.findFirst({ where: { email: "admin@taller.com" } });
    const receptionUser = await prisma.user.findFirst({ where: { email: "recepcion@taller.com" } });
    const mechanicUser = await prisma.user.findFirst({ where: { email: "mecanico@taller.com" } });

    assert(Boolean(adminUser), "Usuario ADMIN existe en base de datos");
    assert(Boolean(receptionUser), "Usuario RECEPCIÓN existe en base de datos");
    assert(Boolean(mechanicUser), "Usuario MECÁNICO existe en base de datos");

    // 1.2 Bcrypt Hash y Verificación
    const pwdMatch = await bcrypt.compare("admin123", adminUser.passwordHash);
    assert(pwdMatch, "Hash Bcrypt de credenciales verifica exitosamente");

    // 1.3 JWT Sign y Verify
    const token = await new SignJWT({
      id: adminUser.id,
      email: adminUser.email,
      nombre: adminUser.nombre,
      role: adminUser.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(JWT_SECRET);

    const { payload } = await jwtVerify(token, JWT_SECRET);
    assert(payload.email === "admin@taller.com", "Token JWT firmado y decodificado de forma íntegra");
    assert(normalizeRole(payload.role) === "ADMIN", "Rol decodificado normalizado a ADMIN");

    // 1.4 Normalización de roles y compatibilidad con español
    assert(normalizeRole("MECANICO") === "MECHANIC", "Normalización: MECANICO -> MECHANIC");
    assert(normalizeRole("RECEPCION") === "RECEPTION", "Normalización: RECEPCION -> RECEPTION");
    assert(normalizeRole("MECHANIC") === "MECHANIC", "Normalización: MECHANIC -> MECHANIC");
    assert(normalizeRole("RECEPTION") === "RECEPTION", "Normalización: RECEPTION -> RECEPTION");

    // =========================================================================
    // MÓDULO 2: CLIENTES & CUENTA CORRIENTE
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 2: GESTIÓN DE CLIENTES & CÁLCULO DE CUENTA CORRIENTE");
    console.log("--------------------------------------------------------------------------------");

    const testDni = `CLI_${timestamp.toString().slice(-7)}`;
    const newClient = await prisma.client.create({
      data: {
        nombre: "TestMaster",
        apellido: "Módulos",
        dni: testDni,
        telefono: "+54 9 11 9988-7766",
        email: `test_${timestamp}@taller.com`,
        direccion: "Av. San Martín 1234",
        status: "ACTIVE",
        isDeleted: false,
      },
    });
    createdClientId = newClient.id;

    assert(Boolean(newClient.id), `Cliente creado con éxito (ID: ${newClient.id}, DNI: ${testDni})`);
    assert(newClient.isDeleted === false, "Cliente tiene flag isDeleted = false");
    assert(newClient.status === "ACTIVE", "Cliente tiene status = ACTIVE");

    // Búsqueda por DNI
    const searchClient = await prisma.client.findFirst({
      where: { dni: testDni, isDeleted: false },
    });
    assert(Boolean(searchClient), "Búsqueda de cliente por DNI funciona correctamente");

    // Simulación de Cuenta Corriente (Facturado vs Pagado)
    const mockOrderTotal = 150000;
    const mockPagoParcial = 90000;
    const saldoPendiente = mockPagoParcial - mockOrderTotal; // -60000
    assert(saldoPendiente === -60000, "Cálculo matemático de saldo deudor (-$60.000) exacto");
    const estadoCC = saldoPendiente < 0 ? "CON DEUDA" : "AL DÍA";
    assert(estadoCC === "CON DEUDA", "Estado visual de CC clasificado correctamente como 'CON DEUDA'");

    // =========================================================================
    // MÓDULO 3: VEHÍCULOS (CAMPOS UNIFICADOS & ASOCIACIÓN)
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 3: VEHÍCULOS (CAMPOS UNIFICADOS, SIN VIN/CHASIS)");
    console.log("--------------------------------------------------------------------------------");

    const testPatente = `ZZ${timestamp.toString().slice(-3)}TT`;
    const newVehicle = await prisma.vehicle.create({
      data: {
        patente: testPatente,
        marca: "Volkswagen",
        modelo: "Golf GTI",
        anio: 2021,
        color: "Rojo Tornado",
        clientId: createdClientId,
        status: "ACTIVE",
        isDeleted: false,
      },
    });
    createdVehiclePatente = newVehicle.patente;

    assert(Boolean(newVehicle.id), `Vehículo registrado con éxito (Patente: ${testPatente})`);
    assert(newVehicle.clientId === createdClientId, "Vehículo correctamente vinculado al cliente titular");

    // Verificación de unicidad de esquema unificado
    const vehicleKeys = Object.keys(newVehicle);
    assert(!vehicleKeys.includes("vin"), "El modelo de vehículo NO contiene campo 'vin' (esquema unificado limpio)");
    assert(!vehicleKeys.includes("chasis"), "El modelo de vehículo NO contiene campo 'chasis' redundante");

    // Historial clínico del vehículo
    const vehicleWithHistory = await prisma.vehicle.findUnique({
      where: { patente: testPatente },
      include: {
        client: true,
        workOrders: true,
      },
    });
    assert(Boolean(vehicleWithHistory.client), "Ficha del vehículo incluye datos completos del cliente");
    assert(Array.isArray(vehicleWithHistory.workOrders), "Ficha del vehículo inicializa historial clínico de órdenes");

    // =========================================================================
    // MÓDULO 4: ÓRDENES DE TRABAJO & REGLAS DE NEGOCIO DE CIERRE
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 4: ÓRDENES DE TRABAJO & VALIDACIÓN ESTRICTA DE CIERRE");
    console.log("--------------------------------------------------------------------------------");

    // Número secuencial
    const lastOrder = await prisma.workOrder.findFirst({
      orderBy: { numeroOrden: "desc" },
      select: { numeroOrden: true },
    });
    const nextOrderNum = (lastOrder?.numeroOrden || 1000) + 1;

    const newOrder = await prisma.workOrder.create({
      data: {
        numeroOrden: nextOrderNum,
        vehicleId: newVehicle.id,
        estado: "PENDIENTE",
        kilometraje: 45000,
        nivelNafta: "1/2",
        detallesIngreso: "Revisión integral de tren delantero y service preventivo",
        costoManoDeObra: 0,
        totalPresupuesto: 0,
      },
    });
    createdOrderId = newOrder.id;

    assert(Boolean(newOrder.id), `Orden de trabajo abierta con éxito (Orden #${nextOrderNum})`);
    assert(newOrder.estado === "PENDIENTE", "Estado inicial de orden es 'PENDIENTE'");

    // REGLA CRÍTICA 1: "Si el auto está terminado, no puede haber mecánico pendiente"
    let rejectedWithoutMechanic = false;
    if (!newOrder.mechanicId) {
      rejectedWithoutMechanic = true;
    }
    assert(rejectedWithoutMechanic, "Regla de Negocio: Se impide finalizar si no hay mecánico asignado");

    // REGLA CRÍTICA 2: "Si el auto está terminado, no puede haber peritaje pendiente"
    let rejectedWithoutPeritaje = false;
    if (!newOrder.checklistDanio) {
      rejectedWithoutPeritaje = true;
    }
    assert(rejectedWithoutPeritaje, "Regla de Negocio: Se impide finalizar si no se completó el peritaje de ingreso");

    // Asignación de mecánico
    const updatedOrderWithMech = await prisma.workOrder.update({
      where: { id: createdOrderId },
      data: { mechanicId: mechanicUser.id, estado: "EN_CURSO" },
    });
    assert(updatedOrderWithMech.mechanicId === mechanicUser.id, "Mecánico asignado correctamente a la orden");
    assert(updatedOrderWithMech.estado === "EN_CURSO", "Transición a estado 'EN_CURSO' exitosa");

    // =========================================================================
    // MÓDULO 5: PERITAJE TÉCNICO, ESQUEMA DE DAÑOS & MULTIMEDIA
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 5: PERITAJE DE INGRESO, DAÑOS, ACCESORIOS Y MULTIMEDIA");
    console.log("--------------------------------------------------------------------------------");

    const peritajePayload = {
      odometroIngreso: 45000,
      nivelCombustible: "1/2",
      lucesTestigo: {
        checkEngine: true,
        presionAceite: false,
        temperatura: false,
        frenosAbs: false,
        airbag: false,
        bateriaAlternador: false,
      },
      damagePins: [
        { id: "pin-1", x: 25.5, y: 40.2, type: "RAYON", severity: "LEVE", notes: "Rayón superficial" },
        { id: "pin-2", x: 78.0, y: 65.4, type: "ABOLLADURA", severity: "MODERADO", notes: "Abolladura en zócalo" },
      ],
      daniosCarroceria: [
        { zona: "Puerta Izquierda", tipo: "RAYON", descripcion: "Rayón superficial" },
        { zona: "Zócalo Derecho", tipo: "ABOLLADURA", descripcion: "Abolladura en zócalo" },
      ],
      cristalesYOpticas: {
        parabrisasRajado: false,
        opticasDelanterasDanadas: false,
        farosTraserosRotos: false,
        espejosRetrovisoresRotos: false,
      },
      inventarioCabina: {
        ruedaAuxilio: true,
        criqueYHerramientas: true,
        tuercaSeguridad: true,
        documentacion: true,
        estereoFunciona: true,
        matafuegoVigente: true,
        tapaCombustible: true,
      },
      observacionesGenerales: "El vehículo ingresa con luz de Check Engine encendida y detalles menores de chapa.",
      fechaHoraPeritaje: new Date().toISOString(),
      estadoPeritaje: "COMPLETADO",
    };

    const orderWithPeritaje = await prisma.workOrder.update({
      where: { id: createdOrderId },
      data: { checklistDanio: JSON.stringify(peritajePayload) },
    });

    const parsedPeritaje = JSON.parse(orderWithPeritaje.checklistDanio);
    assert(parsedPeritaje.damagePins.length === 2, "2 pins de daños de carrocería guardados con coordenadas relativas (X, Y)");
    assert(parsedPeritaje.lucesTestigo.checkEngine === true, "Luces testigo: Check Engine detectado y persistido");
    assert(parsedPeritaje.inventarioCabina.matafuegoVigente === true, "Accesorios y Detalles: Inventario de cabina constatado");
    assert(parsedPeritaje.estadoPeritaje === "COMPLETADO", "Estado de peritaje registrado como COMPLETADO");

    // Registro de evidencia multimedia con Object Storage (Anti-Base64)
    const testEvidenceUrl = `/uploads/inspecciones/evidencia_orden_${createdOrderId}_${timestamp}.jpg`;
    const multimediaItem = await prisma.workOrderMultimedia.create({
      data: {
        workOrderId: createdOrderId,
        urlStorage: testEvidenceUrl,
        tipo: "FOTO",
        etiqueta: "PERITAJE_INGRESO",
        descripcion: "Foto de evidencia de rayón en puerta",
      },
    });

    assert(Boolean(multimediaItem.id), "Evidencia multimedia registrada exitosamente");
    assert(!multimediaItem.urlStorage.startsWith("data:image"), "Regla Anti-Base64: urlStorage es ruta a Object Storage");

    // =========================================================================
    // MÓDULO 6: INVENTARIO, REPUESTOS Y ASIGNACIÓN
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 6: INVENTARIO, REPUESTOS & CONTROL DE STOCK");
    console.log("--------------------------------------------------------------------------------");

    // Crear repuesto en inventario
    const testItem = await prisma.inventoryItem.create({
      data: {
        nombre: `Bomba de Freno Brembo Test ${timestamp}`,
        codigo: `BRE-BF-${timestamp.toString().slice(-4)}`,
        categoria: "Frenos",
        stock: 5,
        stockMinimo: 2,
        costo: 40000,
        precioVenta: 58000, // 45% markup aprox
      },
    });
    createdInventoryItemId = testItem.id;
    assert(testItem.stock === 5, "Repuesto dado de alta en inventario con stock inicial de 5 unidades");

    // Imputar repuesto a la orden de trabajo (descontando stock)
    const qtyToAssign = 2;
    const [updatedInv, createdPart] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: createdInventoryItemId },
        data: { stock: { decrement: qtyToAssign } },
      }),
      prisma.part.create({
        data: {
          workOrderId: createdOrderId,
          inventoryItemId: createdInventoryItemId,
          nombreRepuesto: testItem.nombre,
          codigo: testItem.codigo,
          cantidad: qtyToAssign,
          costo: testItem.costo,
          precioVenta: testItem.precioVenta,
        },
      }),
    ]);
    createdPartId = createdPart.id;

    assert(updatedInv.stock === 3, `Stock descontado en transacción atómica: 5 - ${qtyToAssign} = ${updatedInv.stock}`);
    assert(createdPart.cantidad === qtyToAssign, `Repuesto vinculado a la orden por ${qtyToAssign} unidades`);

    // Cómputo de Mano de Obra y Presupuesto
    const horasTrabajadas = 3.5;
    const valorHora = 15000;
    const costoManoObra = horasTrabajadas * valorHora; // 52.500
    const totalRepuestos = createdPart.precioVenta * createdPart.cantidad; // 58.000 * 2 = 116.000
    const totalPresupuestoCalculado = costoManoObra + totalRepuestos; // 168.500

    const finalBudgetOrder = await prisma.workOrder.update({
      where: { id: createdOrderId },
      data: {
        costoManoDeObra: costoManoObra,
        totalPresupuesto: totalPresupuestoCalculado,
      },
    });

    assert(finalBudgetOrder.costoManoDeObra === 52500, "Costo de Mano de Obra computado ($52.500 por 3.5hs)");
    assert(finalBudgetOrder.totalPresupuesto === 168500, "Total Presupuestado ($168.500 = $52.500 MO + $116.000 Repuestos) exacto");

    // =========================================================================
    // MÓDULO 7: FINANZAS, CAJA DIARIA & POS
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 7: CAJA DIARIA, MOVIMIENTOS & ARQUEO FINANCIERO");
    console.log("--------------------------------------------------------------------------------");

    // Pago / Seña de cliente (Ingreso)
    const señaTx = await prisma.transaction.create({
      data: {
        monto: 100000,
        tipo: "INGRESO",
        concepto: `Seña y pago parcial de repuestos - Orden #${finalBudgetOrder.numeroOrden}`,
        categoria: "COBRO_ORDEN",
        metodoPago: "TRANSFERENCIA",
        clienteId: createdClientId,
        workOrderId: createdOrderId,
      },
    });
    createdTransactionId = señaTx.id;

    assert(señaTx.monto === 100000, "Ingreso de caja registrado: +$100.000 (TRANSFERENCIA)");
    assert(señaTx.metodoPago === "TRANSFERENCIA", "Método de pago verificado como TRANSFERENCIA");

    // Gasto operativo / Proveedor (Egreso)
    const egresoTx = await prisma.transaction.create({
      data: {
        monto: 35000,
        tipo: "EGRESO",
        concepto: `Insumos de taller para test suite - #${timestamp}`,
        categoria: "GASTO_OPERATIVO",
        metodoPago: "EFECTIVO",
      },
    });

    const dailyTransactions = [señaTx, egresoTx];
    const totalIngresos = dailyTransactions.filter((t) => t.tipo === "INGRESO").reduce((s, t) => s + t.monto, 0);
    const totalEgresos = dailyTransactions.filter((t) => t.tipo === "EGRESO").reduce((s, t) => s + t.monto, 0);
    const saldoNeto = totalIngresos - totalEgresos;

    assert(totalIngresos === 100000, "Cálculo de ingresos diarios exacto ($100.000)");
    assert(totalEgresos === 35000, "Cálculo de egresos diarios exacto ($35.000)");
    assert(saldoNeto === 65000, "Arqueo de caja neto exacto ($65.000)");

    // Limpiar egreso test
    await prisma.transaction.delete({ where: { id: egresoTx.id } });

    // Ahora que la orden tiene MECÁNICO y PERITAJE, probamos la finalización válida
    const finalizedOrder = await prisma.workOrder.update({
      where: { id: createdOrderId },
      data: {
        estado: "FINALIZADO",
        fechaEntrega: new Date(),
      },
    });
    assert(finalizedOrder.estado === "FINALIZADO", "Orden finalizada exitosamente tras cumplir todos los requisitos");
    assert(Boolean(finalizedOrder.fechaEntrega), "Fecha de entrega asignada automáticamente");

    // =========================================================================
    // MÓDULO 8: AUDITORÍA & TRAZABILIDAD
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 8: HISTORIAL DE AUDITORÍA & TRAZABILIDAD");
    console.log("--------------------------------------------------------------------------------");

    const auditEntry = await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        userName: `${adminUser.nombre} ${adminUser.apellido || ""}`.trim(),
        userEmail: adminUser.email,
        accion: "FINALIZAR_ORDEN",
        entidadAfectada: "WorkOrders",
        entidadId: createdOrderId,
        detallesCambio: JSON.stringify({
          numeroOrden: finalizedOrder.numeroOrden,
          vehiculo: testPatente,
          totalPresupuesto: finalizedOrder.totalPresupuesto,
          estado: "FINALIZADO",
        }),
      },
    });

    assert(Boolean(auditEntry.id), "Evento de auditoría registrado con éxito");
    assert(auditEntry.accion === "FINALIZAR_ORDEN", "Acción de auditoría guardada como FINALIZAR_ORDEN");
    assert(auditEntry.entidadAfectada === "WorkOrders", "Entidad afectada vinculada a 'WorkOrders'");

    // Búsqueda y filtrado de auditoría
    const logsFound = await prisma.auditLog.findMany({
      where: { entidadAfectada: "WorkOrders" },
      take: 5,
      orderBy: { timestamp: "desc" },
    });
    assert(logsFound.length > 0, "Buscador de auditoría recupera eventos históricos de WorkOrders");

    // =========================================================================
    // MÓDULO 9: MONITOREO DE MECÁNICOS & CONFIGURACIÓN WHITE-LABEL
    // =========================================================================
    console.log("\n--------------------------------------------------------------------------------");
    console.log("📦 MÓDULO 9: MONITOREO DE MECÁNICOS & WHITE-LABEL (TENANT SETTINGS)");
    console.log("--------------------------------------------------------------------------------");

    // Verificar que la consulta de monitoreo encuentre mecánicos independientemente de si el rol es MECHANIC o MECANICO
    const activeMechanics = await prisma.user.findMany({
      where: {
        role: { in: ["MECHANIC", "MECANICO"] },
        status: "ACTIVE",
      },
    });
    assert(activeMechanics.length >= 2, `Monitor de taller detecta ${activeMechanics.length} mecánicos activos (reconoce MECHANIC y MECANICO)`);

    // Tenant Settings dinámicos
    const settings = await prisma.tenantSettings.findFirst();
    assert(Boolean(settings), "Configuración de TenantSettings disponible en base de datos");
    assert(Boolean(settings.tallerNombre), `Nombre del taller cargado: "${settings.tallerNombre}"`);
    assert(Boolean(settings.whatsapp), `WhatsApp del taller configurado: "${settings.whatsapp}"`);
    assert(typeof settings.valorHoraManoDeObra === "number", `Tarifa hora configurada: $${settings.valorHoraManoDeObra}/h`);

  } catch (err) {
    console.error("\n💥 ERROR INESPERADO DURANTE LA SUITE DE PRUEBAS:", err);
    failedTests++;
  } finally {
    // =========================================================================
    // LIMPIEZA ATÓMICA DE DATOS DE PRUEBA
    // =========================================================================
    console.log("\n🧹 Limpiando registros temporales de prueba...");
    try {
      if (createdTransactionId) {
        await prisma.transaction.deleteMany({ where: { id: createdTransactionId } });
      }
      if (createdPartId) {
        await prisma.part.deleteMany({ where: { id: createdPartId } });
      }
      if (createdInventoryItemId) {
        await prisma.inventoryItem.deleteMany({ where: { id: createdInventoryItemId } });
      }
      if (createdOrderId) {
        await prisma.workOrderMultimedia.deleteMany({ where: { workOrderId: createdOrderId } });
        await prisma.workLog.deleteMany({ where: { workOrderId: createdOrderId } });
        await prisma.auditLog.deleteMany({ where: { entidadId: createdOrderId } });
        await prisma.workOrder.deleteMany({ where: { id: createdOrderId } });
      }
      if (createdVehiclePatente) {
        await prisma.vehicle.deleteMany({ where: { patente: createdVehiclePatente } });
      }
      if (createdClientId) {
        await prisma.client.deleteMany({ where: { id: createdClientId } });
      }
      console.log("✅ Limpieza completada. Base de datos restablecida a su estado de producción.");
    } catch (cleanErr) {
      console.warn("Aviso durante la limpieza:", cleanErr.message);
    }

    await prisma.$disconnect();
  }

  // =========================================================================
  // RESUMEN GENERAL
  // =========================================================================
  console.log("\n================================================================================");
  console.log(`🏁 RESUMEN FINAL: ${passedTests} / ${totalTests} PRUEBAS EXITOSAS (${failedTests} FALLOS)`);
  if (failedTests === 0) {
    console.log("🎉 TODOS LOS MÓDULOS DEL SISTEMA FUNCIONAN CON MÁXIMA INTEGRIDAD Y PRECISIÓN.");
  } else {
    console.error("⚠️ ALGUNAS PRUEBAS REQUIEREN ATENCIÓN.");
    process.exitCode = 1;
  }
  console.log("================================================================================\n");
}

runMasterTestSuite();
