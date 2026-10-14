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
  console.log("TEST SUITE: Regla de Negocio - No puede estar en reparación sin mecánico");
  console.log("==================================================================");

  // 1. Obtener Admin y Mecánicos
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN"] } }
  });
  assert(adminUser, "Debe existir un usuario ADMIN");

  const mechs = await prisma.user.findMany({
    where: { role: { in: ["MECHANIC", "MECANICO"] } }
  });
  assert(mechs.length >= 2, "Deben existir al menos 2 mecánicos");
  const mech1 = mechs[0];
  const mech2 = mechs[1];

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

  // Crear cliente y auto temporales
  const suffix = Date.now().toString().slice(-4);
  const client = await prisma.client.create({
    data: {
      nombre: "Test",
      apellido: `MecanicoReq_${suffix}`,
      dni: `DNI-${suffix}`,
      telefono: "+54 11 9999-0000",
      email: `test${suffix}@test.com`,
      direccion: "Calle Test 123",
    }
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      clientId: client.id,
      patente: `MEC-${suffix}`,
      marca: "Toyota",
      modelo: "Yaris",
      anio: 2023,
    }
  });

  // Crear orden en PENDIENTE_PERITAJE sin mecánico (con peritaje completado para aislar el test del mecánico)
  const orderRes = await fetch(`${BASE_URL}/api/work-orders`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      vehiculoPatente: vehicle.patente,
      detallesIngreso: "Revisión técnica de prueba",
      checklistDanio: {
        estadoPeritaje: "COMPLETADO",
        fechaHoraPeritaje: new Date().toISOString(),
        cerrado: true,
      },
    }),
  });
  assert.strictEqual(orderRes.status, 200, "La orden debe crearse en 200");
  const orderData = await orderRes.json();
  const orderId = orderData.order.id;
  console.log(`✔ Orden #${orderData.order.numeroOrden} creada en PENDIENTE_PERITAJE sin mecánico`);

  // TEST 1: Intentar pasar a EN_REPARACION sin mecánico
  console.log("\nProbando TEST 1: Pasar a EN_REPARACION sin mecánico...");
  const res1 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "EN_REPARACION" }),
  });
  assert.strictEqual(res1.status, 400, "Debe rechazar con 400");
  const data1 = await res1.json();
  assert(data1.error.includes("mecánico responsable asignado"), "El error debe mencionar el mecánico requerido");
  console.log(`  ✅ [PASS] Rechazado con 400: "${data1.error}"`);

  // TEST 2: Intentar pasar a EN_CURSO sin mecánico
  console.log("\nProbando TEST 2: Pasar a EN_CURSO sin mecánico...");
  const res2 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "EN_CURSO" }),
  });
  assert.strictEqual(res2.status, 400, "Debe rechazar con 400");
  const data2 = await res2.json();
  assert(data2.error.includes("mecánico responsable asignado"), "El error debe mencionar el mecánico requerido");
  console.log(`  ✅ [PASS] Rechazado con 400: "${data2.error}"`);

  // TEST 3: Intentar pasar a ESPERANDO_REPUESTOS sin mecánico
  console.log("\nProbando TEST 3: Pasar a ESPERANDO_REPUESTOS sin mecánico...");
  const res3 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "ESPERANDO_REPUESTOS" }),
  });
  assert.strictEqual(res3.status, 400, "Debe rechazar con 400");
  const data3 = await res3.json();
  assert(data3.error.includes("mecánico responsable asignado"), "El error debe mencionar el mecánico requerido");
  console.log(`  ✅ [PASS] Rechazado con 400: "${data3.error}"`);

  // TEST 4: Intentar pasar a FINALIZADO sin mecánico
  console.log("\nProbando TEST 4: Pasar a FINALIZADO sin mecánico...");
  const res4 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estado: "FINALIZADO" }),
  });
  assert.strictEqual(res4.status, 400, "Debe rechazar con 400");
  const data4 = await res4.json();
  assert(data4.error.includes("mecánico"), "El error debe mencionar mecánico");
  console.log(`  ✅ [PASS] Rechazado con 400: "${data4.error}"`);

  // TEST 5: Pasar a EN_REPARACION asignando mecánico1 simultáneamente
  console.log("\nProbando TEST 5: Pasar a EN_REPARACION con mecánico asignado simultáneamente...");
  const res5 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      estado: "EN_REPARACION",
      mechanicId: mech1.id,
    }),
  });
  assert.strictEqual(res5.status, 200, "Debe aceptar con 200");
  const data5 = await res5.json();
  assert.strictEqual(data5.order.estado, "EN_REPARACION");
  assert.strictEqual(data5.order.mechanicId, mech1.id);
  console.log(`  ✅ [PASS] Aceptado con 200. Estado: ${data5.order.estado}, Mecánico: ${mech1.nombre}`);

  // TEST 6: Estando en EN_REPARACION, intentar desasignar mecánico
  console.log("\nProbando TEST 6: Intentar desasignar mecánico en orden que está EN_REPARACION...");
  const res6 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mechanicId: null }),
  });
  assert.strictEqual(res6.status, 400, "Debe rechazar con 400 desasignar mecánico en reparación");
  const data6 = await res6.json();
  assert(data6.error.includes("No se puede desasignar"), "El error debe prohibir desasignar mecánico");
  console.log(`  ✅ [PASS] Rechazado con 400: "${data6.error}"`);

  // TEST 7: Cambiar de un mecánico a otro mecánico mientras está en reparación
  console.log("\nProbando TEST 7: Reasignar de mech1 a mech2 mientras está en reparación...");
  const res7 = await fetch(`${BASE_URL}/api/work-orders/${orderId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mechanicId: mech2.id }),
  });
  assert.strictEqual(res7.status, 200, "Debe permitir reasignar a otro mecánico");
  const data7 = await res7.json();
  assert.strictEqual(data7.order.mechanicId, mech2.id);
  console.log(`  ✅ [PASS] Reasignado exitosamente a ${mech2.nombre}`);

  // Limpieza de datos temporales
  await prisma.workOrder.delete({ where: { id: orderId } });
  await prisma.vehicle.delete({ where: { id: vehicle.id } });
  await prisma.client.delete({ where: { id: client.id } });
  console.log("\n✔ Limpieza de datos de prueba completada.");

  console.log("==================================================================");
  console.log("🎉 TODOS LOS TESTS DE REPARACIÓN CON MECÁNICO PASARON (7/7)!");
  console.log("==================================================================");
}

main().catch(err => {
  console.error("❌ Falló la prueba:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
