import { prisma } from "../src/lib/prisma";
import { hashPassword, verifyPassword, signToken, verifyToken, loginUser, normalizeRole } from "../src/lib/auth";
import { uploadVehiclePhoto, deleteVehiclePhoto, getStorageStatus, getVehiclePhotoPublicUrl } from "../src/lib/storage";
import { recordAuditLog } from "../src/lib/audit";

async function runPhase1Tests() {
  console.log("==================================================");
  console.log("🧪 INICIANDO TEST SUITE - FASE 1: SAAS TALLERES");
  console.log("==================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
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
  assert(typeof client?.isDeleted === "boolean", "Cliente posee campo booleano isDeleted");
  assert(Boolean(client?.status), `Cliente posee status: "${client?.status}"`);

  const vehicle = await prisma.vehicle.findFirst();
  assert(Boolean(vehicle), "Vehículo encontrado");
  assert(typeof vehicle?.isDeleted === "boolean", "Vehículo posee campo booleano isDeleted");
  assert(Boolean(vehicle?.patente), `Vehículo posee patente: "${vehicle?.patente}"`);

  // -----------------------------------------------------------------
  // 4. Verificación de Autenticación, Hashing, Token JWT y Login
  // -----------------------------------------------------------------
  console.log("\n4. Verificando Flujo de Autenticación y JWT...");
  const rawPass = "admin123";
  const passHash = await hashPassword(rawPass);
  const isMatch = await verifyPassword(rawPass, passHash);
  assert(isMatch, "Hashing bcrypt y verificación de contraseñas funcionan correctamente");

  // Test loginUser con credenciales correctas
  const loginSuccess = await loginUser("admin@taller.com", "admin123");
  assert(loginSuccess.success === true, "loginUser exitoso con admin@taller.com");
  assert(Boolean(loginSuccess.token), "Token JWT generado en el login");
  assert(loginSuccess.user?.role === "ADMIN", "Rol del usuario en sesión es ADMIN");

  // Test verificación de token JWT
  if (loginSuccess.token) {
    const verified = await verifyToken(loginSuccess.token);
    assert(verified !== null && verified.email === "admin@taller.com", "verifyToken valida la firma JWT y decodifica la sesión");
  }

  // Test loginUser con credenciales incorrectas
  const loginFail = await loginUser("admin@taller.com", "contraseña-incorrecta");
  assert(loginFail.success === false, "loginUser rechaza credenciales incorrectas");

  // -----------------------------------------------------------------
  // 5. Verificación de Storage (Fotos de Vehículos)
  // -----------------------------------------------------------------
  console.log("\n5. Verificando Conexión y Servicio de Object Storage...");
  const storageStatus = getStorageStatus();
  assert(storageStatus.isConfigured, `Proveedor de Storage activo: ${storageStatus.provider} (Bucket: ${storageStatus.bucket})`);

  // Subir buffer de prueba simulando foto de peritaje vehicular
  const dummyImageBuffer = Buffer.from("DATOS_BINARIOS_FOTO_VEHICULO_TEST_FASE_1");
  const uploadRes = await uploadVehiclePhoto(
    dummyImageBuffer,
    "peritaje_frente_toyota.jpg",
    "image/jpeg",
    "vehiculos"
  );
  assert(Boolean(uploadRes.url), `Foto subida al Storage con URL: ${uploadRes.url}`);
  assert(uploadRes.size === dummyImageBuffer.length, "Tamaño de archivo almacenado coincide con el original");

  const publicUrl = getVehiclePhotoPublicUrl(uploadRes.path);
  assert(Boolean(publicUrl), `Resolución de URL pública: ${publicUrl}`);

  // Test eliminación
  const deleteRes = await deleteVehiclePhoto(uploadRes.url);
  assert(deleteRes === true, "Eliminación de foto en Storage completada");

  // -----------------------------------------------------------------
  // 6. Verificación de Audit_Logs (UserID, Accion, Entidad, Valores, Timestamp)
  // -----------------------------------------------------------------
  console.log("\n6. Verificando Registro de Auditoría (Audit_Logs)...");
  const testAudit = await recordAuditLog({
    user: loginSuccess.user,
    accion: "CREATE",
    entidad: "Vehicles",
    entidadId: vehicle?.id,
    valores: { patente: vehicle?.patente, marca: vehicle?.marca, accion: "Test Fase 1" },
    ipAddress: "127.0.0.1",
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
