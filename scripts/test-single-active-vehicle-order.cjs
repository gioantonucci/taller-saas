const http = require("http");
const { PrismaClient } = require("@prisma/client");
const { SignJWT } = require("jose");

const prisma = new PrismaClient();
const PORT = 3001;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-jwt-key-auto-taller-saas-2026-secure-random"
);

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getAdminCookie() {
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });
  if (!adminUser) throw new Error("No se encontró usuario admin");

  const token = await new SignJWT({
    id: adminUser.id,
    email: adminUser.email,
    nombre: adminUser.nombre,
    role: "ADMIN",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  return `auth_token=${token}`;
}

async function main() {
  console.log("==================================================================");
  console.log("TEST SUITE: Regla de Negocio - Un Solo Auto Activo en Taller");
  console.log("==================================================================\n");

  const cookie = await getAdminCookie();
  console.log("✔ Autenticado como ADMIN con token JWT válido.");

  // Test 1: Verificar que un auto con orden activa no permite crear una 2da orden
  const activeOrder = await prisma.workOrder.findFirst({
    where: { estado: { notIn: ["ENTREGADO", "ARCHIVADO"] } },
    include: { vehicle: true },
  });

  if (!activeOrder) {
    console.error("❌ No se encontró ningún vehículo con orden activa en la base de datos.");
    process.exit(1);
  }

  console.log(`\nVehículo de prueba existente: ${activeOrder.vehicle.patente} (Orden activa #${activeOrder.numeroOrden}, Estado: ${activeOrder.estado})`);

  // Intento 1: Creación pasando vehicleId
  const resDuplicateById = await request(
    {
      hostname: "127.0.0.1",
      port: PORT,
      path: "/api/work-orders",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
    {
      vehicleId: activeOrder.vehicleId,
      detallesIngreso: "Intento duplicado por vehicleId",
    }
  );

  if (resDuplicateById.status === 400 && resDuplicateById.data.error.includes("ya cuenta con la Orden activa")) {
    console.log("✔ TEST 1 PASÓ: Creación por vehicleId bloqueada con HTTP 400 y mensaje explícito:");
    console.log("   ->", resDuplicateById.data.error);
  } else {
    console.error("❌ TEST 1 FALLÓ: Se esperaba status 400, recibido:", resDuplicateById);
    process.exit(1);
  }

  // Intento 2: Creación pasando vehiculoPatente de un auto ya activo
  const resDuplicateByPlate = await request(
    {
      hostname: "127.0.0.1",
      port: PORT,
      path: "/api/work-orders",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
    {
      vehiculoPatente: activeOrder.vehicle.patente,
      detallesIngreso: "Intento duplicado por vehiculoPatente",
    }
  );

  if (resDuplicateByPlate.status === 400 && resDuplicateByPlate.data.error.includes("ya cuenta con la Orden activa")) {
    console.log("✔ TEST 2 PASÓ: Creación por vehiculoPatente bloqueada con HTTP 400 y mensaje explícito.");
  } else {
    console.error("❌ TEST 2 FALLÓ: Se esperaba status 400, recibido:", resDuplicateByPlate);
    process.exit(1);
  }

  // Test 3: Ciclo completo con vehículo nuevo
  const testPlate = "TST-" + Math.floor(1000 + Math.random() * 9000);
  console.log(`\nProbando ciclo con nuevo auto ${testPlate}...`);

  // Paso A: Crear Orden 1
  const resOrder1 = await request(
    {
      hostname: "127.0.0.1",
      port: PORT,
      path: "/api/work-orders",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
    {
      clienteNombre: "Juan Test",
      clienteApellido: "Pérez",
      clienteDni: "99" + Math.floor(100000 + Math.random() * 900000),
      clienteTelefono: "1122334455",
      vehiculoPatente: testPlate,
      vehiculoMarca: "Toyota",
      vehiculoModelo: "Corolla",
      vehiculoAnio: "2021",
      detallesIngreso: "Primer ingreso para test de ciclo de vida",
    }
  );

  if ((resOrder1.status !== 200 && resOrder1.status !== 201) || !resOrder1.data.order) {
    console.error("❌ Falló la creación de la primera orden:", resOrder1);
    process.exit(1);
  }

  const order1 = resOrder1.data.order;
  console.log(`✔ TEST 3 PASÓ: Primera orden #${order1.numeroOrden} creada exitosamente (Estado: ${order1.estado}).`);

  // Paso B: Intentar crear una 2da orden mientras la 1ra está activa
  const resOrder2Fail = await request(
    {
      hostname: "127.0.0.1",
      port: PORT,
      path: "/api/work-orders",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
    {
      vehicleId: order1.vehicleId,
      detallesIngreso: "Segundo ingreso en simultáneo (debe fallar)",
    }
  );

  if (resOrder2Fail.status === 400 && resOrder2Fail.data.error.includes("ya cuenta con la Orden activa")) {
    console.log("✔ TEST 4 PASÓ: Creación de segunda orden simultánea denegada con 400 mientras la primera está activa.");
  } else {
    console.error("❌ TEST 4 FALLÓ: Debería haberse rechazado con 400, recibido:", resOrder2Fail);
    process.exit(1);
  }

  // Paso C: Simular fin de trabajo (FINALIZADO) y marcar la 1ra orden como ENTREGADO
  await prisma.workOrder.update({
    where: { id: order1.id },
    data: { estado: "FINALIZADO" },
  });

  const resDeliver = await request(
    {
      hostname: "127.0.0.1",
      port: PORT,
      path: `/api/work-orders/${order1.id}`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
    {
      estado: "ENTREGADO",
    }
  );

  if (resDeliver.status !== 200) {
    console.error("❌ Falló la entrega de la primera orden:", resDeliver);
    process.exit(1);
  }
  console.log(`✔ TEST 5 PASÓ: Primera orden #${order1.numeroOrden} marcada como ENTREGADO y archivada.`);

  // Paso D: Ahora que la 1ra orden está ENTREGADO, intentar crear la 2da orden para el mismo auto
  const resOrder2Success = await request(
    {
      hostname: "127.0.0.1",
      port: PORT,
      path: "/api/work-orders",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
    },
    {
      vehicleId: order1.vehicleId,
      detallesIngreso: "Segundo ingreso legítimo (posterior a entrega)",
    }
  );

  if ((resOrder2Success.status === 200 || resOrder2Success.status === 201) && resOrder2Success.data.order) {
    console.log(`✔ TEST 6 PASÓ: Segunda orden #${resOrder2Success.data.order.numeroOrden} creada exitosamente porque la anterior fue entregada!`);
  } else {
    console.error("❌ TEST 6 FALLÓ: No se pudo crear la orden posterior a entrega:", resOrder2Success);
    process.exit(1);
  }

  // Limpieza de datos de prueba
  const testVehicle = await prisma.vehicle.findUnique({
    where: { id: order1.vehicleId },
  });
  await prisma.workOrder.deleteMany({
    where: { vehicleId: order1.vehicleId },
  });
  if (testVehicle) {
    await prisma.vehicle.delete({
      where: { id: testVehicle.id },
    });
    if (testVehicle.clientId) {
      await prisma.client.delete({
        where: { id: testVehicle.clientId },
      }).catch(() => {});
    }
  }
  console.log("\n✔ Datos temporales de prueba limpiados correctamente.");

  console.log("\n==================================================================");
  console.log("¡TODAS LAS PRUEBAS (6/6) PASARON SATISFACTORIAMENTE!");
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("Error inesperado en test:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
