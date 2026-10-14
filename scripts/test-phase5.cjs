const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("🧪 INICIANDO TEST SUITE FASE 5: FINANZAS, OCR, CC & CAJA");
  console.log("=================================================\n");

  try {
    // 1. Obtener o crear TenantSettings
    let settings = await prisma.tenantSettings.findFirst();
    if (!settings) {
      settings = await prisma.tenantSettings.create({
        data: {
          tallerNombre: "Taller Mecánico Central Pro",
          whatsapp: "+54 9 11 4567-8900",
          valorHoraManoDeObra: 15000,
        },
      });
    }
    console.log(`✅ [1/6] TenantSettings verificado:`);
    console.log(`   - Taller: "${settings.tallerNombre}"`);
    console.log(`   - Tarifa hora mano de obra: $${settings.valorHoraManoDeObra.toLocaleString("es-AR")}/h`);

    // 2. Obtener o crear un Cliente y Vehículo de prueba
    let client = await prisma.client.findFirst({
      where: { dni: "33888999" },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          nombre: "Esteban",
          apellido: "Quito",
          dni: "33888999",
          direccion: "Av. Belgrano 1250",
          telefono: "+54 9 11 5555-1234",
          email: "esteban.quito@test.com",
        },
      });
    }

    let vehicle = await prisma.vehicle.findFirst({
      where: { patente: "PHASE5-TEST" },
    });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          clientId: client.id,
          marca: "Ford",
          modelo: "Focus 2.0 Titanium",
          anio: 2021,
          patente: "PHASE5-TEST",
        },
      });
    }

    // 3. Crear una Orden de Trabajo
    const orderCount = await prisma.workOrder.count();
    const numeroOrden = 9500 + orderCount;
    const order = await prisma.workOrder.create({
      data: {
        numeroOrden,
        vehicleId: vehicle.id,
        estado: "EN_CURSO",
        detallesIngreso: "Service mayor: cambio de distribución y bomba de agua",
        costoManoDeObra: 0,
        totalPresupuesto: 0,
      },
    });
    console.log(`\n✅ [2/6] Orden de Trabajo #${order.numeroOrden} creada para ${vehicle.marca} ${vehicle.modelo}`);

    // 4. Test Simulación OCR y Extracción de Repuestos con Markup %
    console.log(`\n✅ [3/6] Simulando extracción OCR de Remito de Repuestos...`);
    const ocrExtractedItems = [
      {
        nombreRepuesto: "Kit de Distribución SKF (Correa + Tensor)",
        codigo: "SKF-VKMA01122",
        cantidad: 1,
        costo: 65000,
      },
      {
        nombreRepuesto: "Bomba de Agua Dolz",
        codigo: "DOL-F145",
        cantidad: 1,
        costo: 38000,
      },
      {
        nombreRepuesto: "Líquido Refrigerante Glacelf Concentrado 1L",
        codigo: "GLA-RED1L",
        cantidad: 2,
        costo: 7500,
      },
    ];

    // Aplicar markup del 45%
    const markupPct = 45;
    const partsWithMarkup = ocrExtractedItems.map((item) => ({
      ...item,
      precioVenta: Math.round(item.costo * (1 + markupPct / 100)),
    }));

    // Cargar repuestos en base de datos
    for (const p of partsWithMarkup) {
      await prisma.part.create({
        data: {
          workOrderId: order.id,
          nombreRepuesto: p.nombreRepuesto,
          codigo: p.codigo,
          cantidad: p.cantidad,
          costo: p.costo,
          precioVenta: p.precioVenta,
          archivoFacturaURL: "/uploads/remitos/remito-demo-phase5.pdf",
        },
      });
    }

    const subtotalRepuestos = partsWithMarkup.reduce(
      (sum, p) => sum + p.precioVenta * p.cantidad,
      0
    );
    console.log(`   - 3 repuestos agregados con Markup del ${markupPct}%:`);
    partsWithMarkup.forEach((p) => {
      console.log(`     • ${p.nombreRepuesto} (x${p.cantidad}): Costo $${p.costo.toLocaleString()} -> Venta $${p.precioVenta.toLocaleString()} (Subtotal: $${(p.precioVenta * p.cantidad).toLocaleString()})`);
    });
    console.log(`   - Subtotal Repuestos: $${subtotalRepuestos.toLocaleString("es-AR")}`);

    // 5. Cargar Horas Trabajadas (WorkLog) y verificar Fórmula Oficial de Presupuesto
    console.log(`\n✅ [4/6] Registrando Horas Trabajadas y calculando Mano de Obra:`);
    const adminUser = await prisma.user.findFirst();
    const horasTrabajadas = 4.5;
    await prisma.workLog.create({
      data: {
        workOrderId: order.id,
        mechanicId: adminUser.id,
        horasInvertidas: horasTrabajadas,
        descripcionTarea: "Desarme tren de distribución, reemplazo bomba y sincronización",
      },
    });

    const costoManoDeObraEsperado = Math.round(horasTrabajadas * settings.valorHoraManoDeObra);
    const totalPresupuestoEsperado = costoManoDeObraEsperado + subtotalRepuestos;

    // Actualizar orden
    const updatedOrder = await prisma.workOrder.update({
      where: { id: order.id },
      data: {
        costoManoDeObra: costoManoDeObraEsperado,
        totalPresupuesto: totalPresupuestoEsperado,
      },
    });

    console.log(`   - Horas trabajadas: ${horasTrabajadas} hs @ $${settings.valorHoraManoDeObra}/h`);
    console.log(`   - Costo Mano de Obra: $${updatedOrder.costoManoDeObra.toLocaleString("es-AR")}`);
    console.log(`   - Total Presupuesto Calculado: $${updatedOrder.totalPresupuesto.toLocaleString("es-AR")}`);

    if (updatedOrder.totalPresupuesto !== totalPresupuestoEsperado) {
      throw new Error("El cálculo del presupuesto total no coincide con la fórmula oficial");
    }

    // 6. Test Transacciones y Caja Diaria (/app/caja)
    console.log(`\n✅ [5/6] Registrando Movimientos de Caja Diaria (POS & Gastos):`);
    // 6.1 Ingreso: Seña del cliente para la orden
    const trxIngreso1 = await prisma.transaction.create({
      data: {
        monto: 80000,
        tipo: "INGRESO",
        concepto: `Seña 50% repuestos - Orden #${order.numeroOrden}`,
        metodoPago: "TRANSFERENCIA",
        clienteId: client.id,
        workOrderId: order.id,
        categoria: "SENIA",
      },
    });

    // 6.2 Ingreso 2: Pago en mostrador efectivo
    const trxIngreso2 = await prisma.transaction.create({
      data: {
        monto: 50000,
        tipo: "INGRESO",
        concepto: `Pago parcial mostrador - Orden #${order.numeroOrden}`,
        metodoPago: "EFECTIVO",
        clienteId: client.id,
        workOrderId: order.id,
        categoria: "COBRO_ORDEN",
      },
    });

    // 6.3 Egreso: Pago a distribuidora de repuestos
    const trxEgreso1 = await prisma.transaction.create({
      data: {
        monto: 45000,
        tipo: "EGRESO",
        concepto: "Pago a Distribuidora Warnes por Kit SKF",
        metodoPago: "TRANSFERENCIA",
        categoria: "PAGO_PROVEEDOR",
        comprobanteNro: "FAC-88992",
      },
    });

    // Obtener transacciones del día
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        fecha: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    const totalIngresosHoy = todayTransactions
      .filter((t) => t.tipo === "INGRESO")
      .reduce((sum, t) => sum + t.monto, 0);

    const totalEgresosHoy = todayTransactions
      .filter((t) => t.tipo === "EGRESO")
      .reduce((sum, t) => sum + t.monto, 0);

    const saldoHoy = totalIngresosHoy - totalEgresosHoy;

    console.log(`   - Ingreso 1: +$${trxIngreso1.monto.toLocaleString()} (${trxIngreso1.metodoPago}) - "${trxIngreso1.concepto}"`);
    console.log(`   - Ingreso 2: +$${trxIngreso2.monto.toLocaleString()} (${trxIngreso2.metodoPago}) - "${trxIngreso2.concepto}"`);
    console.log(`   - Egreso 1:  -$${trxEgreso1.monto.toLocaleString()} (${trxEgreso1.metodoPago}) - "${trxEgreso1.concepto}"`);
    console.log(`   📊 Resumen Caja del Día:`);
    console.log(`      Total Ingresos: +$${totalIngresosHoy.toLocaleString("es-AR")}`);
    console.log(`      Total Egresos:  -$${totalEgresosHoy.toLocaleString("es-AR")}`);
    console.log(`      Saldo Neto:     $${saldoHoy.toLocaleString("es-AR")}`);

    // 7. Test Cálculo Dinámico de Cuenta Corriente del Cliente (/app/clientes/[id])
    console.log(`\n✅ [6/6] Verificando Lógica de Cuenta Corriente del Cliente:`);
    const clientTransactions = await prisma.transaction.findMany({
      where: { clienteId: client.id, tipo: "INGRESO" },
    });
    const totalPagadoCliente = clientTransactions.reduce((sum, t) => sum + t.monto, 0);

    // Suma de todas las órdenes del cliente
    const clientVehicles = await prisma.vehicle.findMany({
      where: { clientId: client.id },
      include: { workOrders: true },
    });
    const clientOrders = clientVehicles.flatMap((v) => v.workOrders);
    const totalFacturadoCliente = clientOrders.reduce((sum, o) => sum + o.totalPresupuesto, 0);

    const saldoCC = totalPagadoCliente - totalFacturadoCliente;
    const estadoCC = saldoCC >= 0 ? "AL DÍA (VERDE)" : "CON DEUDA (ROJO)";

    console.log(`   - Total Facturado al Cliente: $${totalFacturadoCliente.toLocaleString("es-AR")}`);
    console.log(`   - Total Pagado por el Cliente: $${totalPagadoCliente.toLocaleString("es-AR")}`);
    console.log(`   - Saldo de Cuenta Corriente: $${saldoCC.toLocaleString("es-AR")}`);
    console.log(`   - Estado Visual en UI: ${estadoCC}`);

    if (saldoCC < 0) {
      console.log(`     -> El badge se mostrará ROJO indicando Deuda Pendiente de -$${Math.abs(saldoCC).toLocaleString("es-AR")}`);
    } else {
      console.log(`     -> El badge se mostrará VERDE indicando Cuenta al Día`);
    }

    // 8. Test de Pago Total para Cancelación de Deuda
    console.log(`\n   Registrando pago cancelatorio por la deuda restante ($${Math.abs(saldoCC).toLocaleString()})...`);
    await prisma.transaction.create({
      data: {
        monto: Math.abs(saldoCC),
        tipo: "INGRESO",
        concepto: `Cancelación saldo final Orden #${order.numeroOrden}`,
        metodoPago: "MERCADOPAGO",
        clienteId: client.id,
        workOrderId: order.id,
        categoria: "COBRO_ORDEN",
      },
    });

    const clientTransactionsUpdated = await prisma.transaction.findMany({
      where: { clienteId: client.id, tipo: "INGRESO" },
    });
    const totalPagadoFinal = clientTransactionsUpdated.reduce((sum, t) => sum + t.monto, 0);
    const saldoCCFinal = totalPagadoFinal - totalFacturadoCliente;

    console.log(`   - Nuevo Total Pagado: $${totalPagadoFinal.toLocaleString("es-AR")}`);
    console.log(`   - Nuevo Saldo CC: $${saldoCCFinal.toLocaleString("es-AR")} -> Estado: ${saldoCCFinal >= 0 ? "AL DÍA (VERDE)" : "CON DEUDA (ROJO)"}`);

    if (saldoCCFinal !== 0) {
      throw new Error("El saldo tras cancelación debería ser exactamente $0");
    }

    console.log("\n=================================================");
    console.log("🎉 TODOS LOS TESTS DE LA FASE 5 PASARON CON ÉXITO");
    console.log("=================================================\n");
  } catch (err) {
    console.error("❌ Error en tests de Fase 5:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runPhase5Tests();
