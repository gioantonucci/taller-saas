const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");
const assert = require("assert");

const prisma = new PrismaClient();
const BASE_URL = "http://localhost:3001";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-auto-taller-saas-2026-secure-random"
);

async function main() {
  console.log("==================================================================");
  console.log("TEST SUITE: Regla de Negocio - No puede llegar a reparación sin peritaje");
  console.log("==================================================================");

  // 1. Obtener Admin y Mecánico
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN"] } },
  });
  assert(adminUser, "Debe existir un usuario ADMIN");

  const mech = await prisma.user.findFirst({
    where: { role: { in: ["MECHANIC", "MECANICO"] } },
  });
  assert(mech, "Debe existir un mecánico");

  const adminToken = await new SignJWT({
    id: adminUser.id,
    userId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    nombre: adminUser.nombre,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(JWT_SECRET);

  const headers = {
    "Content-Type": "application/json",
    Cookie: `auth_token=${adminToken}`,
  };

  // 2. Crear vehículo de prueba
  const suffix = Date.now().toString().slice(-4);
  const client = await prisma.client.create({
    data: {
      nombre: "Test",
      apellido: `PeritajeReq_${suffix}`,
      dni: `DNI-${suffix}`,
      telefono: "+54 11 8888-0000",
      email: `peritaje${suffix}@test.com`,
      direccion: "Av Libertador 5000",
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      clientId: client.id,
      patente: `PER-${suffix}`,
      marca: "Ford",
      modelo: "Focus",
      anio: 2022,
    },
  });

  // 3. Crear orden en PENDIENTE_PERITAJE CON mecánico asignado pero SIN peritaje
  const orderRes = await fetch(`${BASE_URL}/api/work-orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      vehiculoPatente: vehicle.patente,
      mechanicId: mech.id,
      detallesIngreso: "Ingreso sin peritaje realizado",
    }),
  });
  assert.strictEqual(orderRes.status, 200, "La orden debe crearse en 200");
  const orderData = await orderRes.json();
  const orderId = orderData.order.id;
  console.log(`✔ Orden #${orderData.order.numeroOrden} creada en PENDIENTE_PERITAJE sin peritaje`);

  // TEST 1: Intentar pasar a EN_REPARACION sin haber completado peritaje
  console.log("\nProbando TEST 1: Intentar pasar a EN_REPARACION sin peritaje...");
  const res1 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "EN_REPARACION" }),
  });
  assert.strictEqual(res1.status, 400, "Debe rechazar con 400");
  const data1 = await res1.json();
  assert(
    data1.error.includes("No se puede avanzar al punto de reparación sin haber realizado previamente el peritaje"),
    `Mensaje incorrecto: ${data1.error}`
  );
  console.log(`  ✅ [PASS] Rechazado con 400: "${data1.error}"`);

  // TEST 2: Intentar pasar a EN_CURSO sin peritaje
  console.log("\nProbando TEST 2: Intentar pasar a EN_CURSO sin peritaje...");
  const res2 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "EN_CURSO" }),
  });
  assert.strictEqual(res2.status, 400, "Debe rechazar con 400");
  const data2 = await res2.json();
  assert(data2.error.includes("peritaje"), `Mensaje incorrecto: ${data2.error}`);
  console.log(`  ✅ [PASS] Rechazado con 400: "${data2.error}"`);

  // TEST 3: Intentar pasar a ESPERANDO_REPUESTOS sin peritaje
  console.log("\nProbando TEST 3: Intentar pasar a ESPERANDO_REPUESTOS sin peritaje...");
  const res3 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "ESPERANDO_REPUESTOS" }),
  });
  assert.strictEqual(res3.status, 400, "Debe rechazar con 400");
  const data3 = await res3.json();
  assert(data3.error.includes("peritaje"), `Mensaje incorrecto: ${data3.error}`);
  console.log(`  ✅ [PASS] Rechazado con 400: "${data3.error}"`);

  // TEST 4: Intentar registrar horas en WorkLog sin haber hecho peritaje
  console.log("\nProbando TEST 4: Intentar registrar horas en WorkLog sin peritaje...");
  const res4 = await fetch(`${BASE_URL}/api/work-orders/${orderId}/work-logs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      horasInvertidas: 2.0,
      descripcionTarea: "Desarmado de tren delantero",
    }),
  });
  assert.strictEqual(res4.status, 400, "Debe rechazar con 400");
  const data4 = await res4.json();
  assert(data4.error.includes("peritaje"), `Mensaje incorrecto: ${data4.error}`);
  console.log(`  ✅ [PASS] Rechazado con 400: "${data4.error}"`);

  // TEST 5: Pasar a EN_REPARACION completando el peritaje técnico simultáneamente (como hace PeritajeIngresoModal)
  console.log("\nProbando TEST 5: Pasar a EN_REPARACION completando peritaje técnico...");
  const res5 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      estado: "EN_REPARACION",
      checklistDanio: {
        estadoPeritaje: "COMPLETADO",
        fechaHoraPeritaje: new Date().toISOString(),
        cerrado: true,
        damagePins: [{ x: 50, y: 50, note: "Rayón paragolpe" }],
      },
    }),
  });
  assert.strictEqual(res5.status, 200, "Debe aceptar con 200");
  const data5 = await res5.json();
  assert.strictEqual(data5.order.estado, "EN_REPARACION");
  console.log(`  ✅ [PASS] Aceptado con 200. Estado: ${data5.order.estado}`);

  // TEST 6: Ahora que el peritaje está completo, registrar horas en WorkLog
  console.log("\nProbando TEST 6: Registrar horas en WorkLog ahora que el auto está peritado y en reparación...");
  const res6 = await fetch(`${BASE_URL}/api/work-orders/${orderId}/work-logs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      horasInvertidas: 2.0,
      descripcionTarea: "Reparación de chapería y pintura completada",
    }),
  });
  assert.strictEqual(res6.status, 200, "Debe aceptar con 200");
  const data6 = await res6.json();
  assert(data6.success, "Debe registrarse exitosamente");
  console.log(`  ✅ [PASS] WorkLog registrado con 2.0 hs`);

  // TEST 7: Intentar volver a PENDIENTE_PERITAJE una vez que ya fue peritado
  console.log("\nProbando TEST 7: Intentar retroceder a peritaje una vez en reparación...");
  const res7 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "PENDIENTE_PERITAJE" }),
  });
  assert.strictEqual(res7.status, 400, "Debe rechazar volver a peritaje");
  const data7 = await res7.json();
  assert(data7.error.includes("peritaje"), `Mensaje incorrecto: ${data7.error}`);
  console.log(`  ✅ [PASS] Rechazado con 400: "${data7.error}"`);

  // 4. Limpieza
  await prisma.workLog.deleteMany({ where: { workOrderId: orderId } });
  await prisma.auditLog.deleteMany({ where: { entidadId: orderId } });
  await prisma.workOrder.delete({ where: { id: orderId } });
  await prisma.vehicle.delete({ where: { id: vehicle.id } });
  await prisma.client.delete({ where: { id: client.id } });
  console.log("\n✔ Limpieza de datos de prueba completada.");

  console.log("==================================================================");
  console.log("🎉 TODOS LOS TESTS DE PERITAJE REQUERIDO PASARON SATISFACTORIAMENTE (7/7)!");
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("❌ ERROR EN TEST SUITE:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
