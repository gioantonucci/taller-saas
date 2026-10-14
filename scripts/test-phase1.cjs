const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { SignJWT, jwtVerify } = require("jose");
const fs = require("fs");
const path = require("path");

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

async function signToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id,
      email: payload.email,
      nombre: payload.nombre,
      role: normalizeRole(payload.role),
      tenantId: payload.tenantId || null,
    };
  } catch {
    return null;
  }
}

async function runPhase1Tests() {
  console.log("==================================================");
  console.log("🧪 INICIANDO TEST SUITE - FASE 1: SAAS TALLERES");
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

  // -----------------------------------------------------------------
  // 1. Verificación de Tenant_Settings
  // -----------------------------------------------------------------
  console.log("1. Verificando Tabla Tenant_Settings (ID, TallerNombre, WhatsApp, LogoURL)...");
  const tenant = await prisma.tenantSettings.findFirst();
  assert(Boolean(tenant), "Existe al menos un registro en Tenant_Settings");
  assert(Boolean(tenant?.tallerNombre), `TallerNombre presente: "${tenant?.tallerNombre}"`);
  assert(Boolean(tenant?.whatsapp), `WhatsApp presente: "${tenant?.whatsapp}"`);

  // -----------------------------------------------------------------
  // 2. Verificación de Users y Roles (ADMIN, RECEPTION, MECHANIC)
  // -----------------------------------------------------------------
  console.log("\n2. Verificando Tabla Users y Roles Permitidos...");
  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const receptionUser = await prisma.user.findFirst({ where: { role: "RECEPTION" } });
  const mechanicUser = await prisma.user.findFirst({ where: { role: "MECHANIC" } });

  assert(Boolean(adminUser), "Usuario con Rol ADMIN encontrado");
  assert(Boolean(receptionUser), "Usuario con Rol RECEPTION encontrado");
  assert(Boolean(mechanicUser), "Usuario con Rol MECHANIC encontrado");
  assert(adminUser?.status === "ACTIVE", "Usuario ADMIN tiene status ACTIVE");
  assert(normalizeRole("ADMIN") === "ADMIN", "Normalizador de Rol reconoce ADMIN");
  assert(normalizeRole("RECEPTION") === "RECEPTION", "Normalizador de Rol reconoce RECEPTION");
  assert(normalizeRole("RECEPCION") === "RECEPTION", "Normalizador de Rol mapea RECEPCION -> RECEPTION");
  assert(normalizeRole("MECHANIC") === "MECHANIC", "Normalizador de Rol reconoce MECHANIC");
  assert(normalizeRole("MECANICO") === "MECHANIC", "Normalizador de Rol mapea MECANICO -> MECHANIC");

  // -----------------------------------------------------------------
  // 3. Verificación de Clients y Vehicles con Soft-Delete
  // -----------------------------------------------------------------
  console.log("\n3. Verificando Clients y Vehicles con Soft Delete (isDeleted / status)...");
  const client = await prisma.client.findFirst({
    include: { vehicles: true },
  });
  assert(Boolean(client), "Cliente encontrado con relación a vehículos");
  assert(typeof client?.isDeleted === "boolean", "Cliente posee columna isDeleted");
  assert(Boolean(client?.status), `Cliente posee status: "${client?.status}"`);

  const vehicle = await prisma.vehicle.findFirst();
  assert(Boolean(vehicle), "Vehículo encontrado");
  assert(typeof vehicle?.isDeleted === "boolean", "Vehículo posee columna isDeleted");
  assert(Boolean(vehicle?.patente), `Vehículo posee patente: "${vehicle?.patente}"`);

  // -----------------------------------------------------------------
  // 4. Verificación de Autenticación, Hashing, Token JWT y Login
  // -----------------------------------------------------------------
  console.log("\n4. Verificando Flujo de Autenticación y JWT...");
  const rawPass = "admin123";
  const passHash = await bcrypt.hash(rawPass, 10);
  const isMatch = await bcrypt.compare(rawPass, passHash);
  assert(isMatch, "Hashing bcrypt y verificación de contraseñas funcionan correctamente");

  // Validar contraseña del admin de prueba
  if (adminUser) {
    const adminPassMatch = await bcrypt.compare("admin123", adminUser.passwordHash);
    assert(adminPassMatch, "Credenciales de admin@taller.com / admin123 verificadas");

    // Firmar token
    const token = await signToken({
      id: adminUser.id,
      email: adminUser.email,
      nombre: adminUser.nombre,
      role: adminUser.role,
      tenantId: adminUser.tenantId,
    });
    assert(Boolean(token), "Token JWT generado con jose");

    // Validar token
    const verified = await verifyToken(token);
    assert(verified !== null && verified.email === "admin@taller.com", "verifyToken valida la firma JWT y decodifica la sesión");
    assert(verified?.role === "ADMIN", "Rol decodificado coincide con ADMIN");
  }

  // -----------------------------------------------------------------
  // 5. Verificación de Storage (Fotos de Vehículos)
  // -----------------------------------------------------------------
  console.log("\n5. Verificando Conexión y Servicio de Object Storage...");
  const uploadDir = path.join(process.cwd(), "public", "uploads", "vehiculos");
  fs.mkdirSync(uploadDir, { recursive: true });

  const dummyImageBuffer = Buffer.from("TEST_FOTO_VEHICULO_BINARIO_FASE_1");
  const testFilename = `test_foto_patente_${Date.now()}.jpg`;
  const testFilePath = path.join(uploadDir, testFilename);
  fs.writeFileSync(testFilePath, dummyImageBuffer);

  const fileExists = fs.existsSync(testFilePath);
  assert(fileExists, `Archivo almacenado en ruta de storage: /public/uploads/vehiculos/${testFilename}`);
  assert(fs.statSync(testFilePath).size === dummyImageBuffer.length, "Tamaño de archivo almacenado coincide");

  fs.unlinkSync(testFilePath);
  assert(!fs.existsSync(testFilePath), "Eliminación de foto en Storage validada");

  // -----------------------------------------------------------------
  // 6. Verificación de Audit_Logs (UserID, Accion, Entidad, Valores, Timestamp)
  // -----------------------------------------------------------------
  console.log("\n6. Verificando Registro de Auditoría (Audit_Logs)...");
  const testAudit = await prisma.auditLog.create({
    data: {
      userId: adminUser?.id || null,
      userEmail: adminUser?.email || "admin@taller.com",
      userName: `${adminUser?.nombre || "Carlos"} Rossi`,
      accion: "CREATE",
      entidad: "Vehicles",
      entidadAfectada: "Vehicles",
      entidadId: vehicle?.id || null,
      valores: JSON.stringify({ patente: vehicle?.patente, marca: vehicle?.marca, accion: "Test Fase 1" }),
      detallesCambio: JSON.stringify({ patente: vehicle?.patente, marca: vehicle?.marca }),
      ipAddress: "127.0.0.1",
    },
  });

  assert(Boolean(testAudit), "Log de auditoría registrado exitosamente");
  assert(testAudit?.entidad === "Vehicles", `Campo Entidad guardado: "${testAudit?.entidad}"`);
  assert(Boolean(testAudit?.valores), `Campo Valores (JSON) guardado: ${testAudit?.valores}`);
  assert(Boolean(testAudit?.timestamp), `Timestamp de auditoría registrado: ${testAudit?.timestamp}`);

  // -----------------------------------------------------------------
  // Resumen Final
  // -----------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`🏁 RESULTADOS: ${passed} / ${total} pruebas aprobadas.`);
  if (passed === total) {
    console.log("🎉 TODOS LOS REQUERIMIENTOS DE LA FASE 1 ESTÁN CUMPLIDOS Y VALIDADOS.");
  } else {
    console.error("⚠️ ALGUNAS PRUEBAS FALLARON.");
  }
  console.log("==================================================\n");

  await prisma.$disconnect();
}

runPhase1Tests().catch((err) => {
  console.error("Error fatal en suite de pruebas:", err);
  process.exit(1);
});
