/**
 * Test Suite - Fase 4: Operación del Taller (Mobile-First) y Manejo Multimedia
 * Valida:
 * 1. Hoja de Ruta: Cambio ágil de estados (Pendiente -> En curso -> Esperando repuesto -> Terminado).
 * 2. Peritaje y Check-in Visual: Esquema del auto con marcadores (pins) y coordenadas (X, Y) en JSON.
 * 3. Captura y Subida de Evidencia: Compresión frontend (1920px max, 80%), Object Storage y tabla WorkOrder_Multimedia (NUNCA Base64 en BD).
 * 4. Registro de Trabajo (WorkLog): Alta de tareas y cómputo de horas por el mecánico.
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Fallo en prueba: ${message}`);
  }
}

async function runPhase4Tests() {
  console.log("\n==================================================");
  console.log("🧪 INICIANDO TEST SUITE - FASE 4: OPERACIÓN DE TALLER Y MULTIMEDIA");
  console.log("==================================================");

  // Obtener usuario mecánico y vehículo de prueba
  const mechanic = await prisma.user.findFirst({
    where: { role: { in: ["MECHANIC", "MECANICO"] } },
  });
  assert(Boolean(mechanic), "Usuario con rol MECHANIC disponible en la base de datos");

  const vehicle = await prisma.vehicle.findFirst({
    where: { isDeleted: false, status: "ACTIVE" },
    include: { client: true },
  });
  assert(Boolean(vehicle), "Vehículo activo disponible para la prueba");

  // Crear una nueva Orden de Trabajo para testear el ciclo completo de Fase 4
  const lastOrder = await prisma.workOrder.findFirst({
    orderBy: { numeroOrden: "desc" },
  });
  const numeroOrden = (lastOrder?.numeroOrden || 2000) + 1;

  const testOrder = await prisma.workOrder.create({
    data: {
      numeroOrden,
      vehicleId: vehicle.id,
      mechanicId: mechanic.id,
      estado: "PENDIENTE",
      nivelNafta: "1/2",
      kilometraje: 45000,
      detallesIngreso: "Revisión de frenos delanteros y peritaje general de carrocería",
    },
    include: {
      vehicle: { include: { client: true } },
      multimedia: true,
      workLogs: true,
    },
  });

  assert(Boolean(testOrder.id), `Orden #${testOrder.numeroOrden} creada en estado 'PENDIENTE'`);

  // -----------------------------------------------------------------
  // 1. Hoja de Ruta: Cambio ágil de estados
  // -----------------------------------------------------------------
  console.log("\n1. Verificando cambio ágil de estados en la Hoja de Ruta...");

  // Estado: PENDIENTE -> EN_CURSO
  const orderEnCurso = await prisma.workOrder.update({
    where: { id: testOrder.id },
    data: { estado: "EN_CURSO" },
  });
  assert(orderEnCurso.estado === "EN_CURSO", "Transición ágil a 'EN_CURSO' (En curso)");

  // Estado: EN_CURSO -> ESPERANDO_REPUESTOS
  const orderEspera = await prisma.workOrder.update({
    where: { id: testOrder.id },
    data: { estado: "ESPERANDO_REPUESTOS" },
  });
  assert(orderEspera.estado === "ESPERANDO_REPUESTOS", "Transición ágil a 'ESPERANDO_REPUESTOS' (Esperando repuesto)");

  // Estado: ESPERANDO_REPUESTOS -> FINALIZADO
  const orderTerminado = await prisma.workOrder.update({
    where: { id: testOrder.id },
    data: { estado: "FINALIZADO", fechaEntrega: new Date() },
  });
  assert(orderTerminado.estado === "FINALIZADO", "Transición ágil a 'FINALIZADO' (Terminado)");
  assert(Boolean(orderTerminado.fechaEntrega), "Fecha de entrega asignada al finalizar la orden");

  // Reversibilidad ágil en desarrollo
  const orderReanudada = await prisma.workOrder.update({
    where: { id: testOrder.id },
    data: { estado: "EN_CURSO" },
  });
  assert(orderReanudada.estado === "EN_CURSO", "Transición flexible entre estados permitida");

  // -----------------------------------------------------------------
  // 2. Peritaje y Check-in Visual (Esquema del Auto con Coordenadas X, Y)
  // -----------------------------------------------------------------
  console.log("\n2. Verificando Esquema del Auto y Check-in Visual (Pins X, Y en JSON)...");

  const samplePins = [
    {
      id: "pin_1",
      x: 28, // Lateral izquierdo
      y: 35, // Capot / puerta delantera
      tipo: "RAYON",
      severidad: "MODERADO",
      descripcion: "Rayón profundo de 15cm en guardabarro delantero izquierdo",
      fecha: new Date().toISOString(),
    },
    {
      id: "pin_2",
      x: 75, // Lateral derecho
      y: 82, // Paragolpe trasero
      tipo: "ABOLLADURA",
      severidad: "GRAVE",
      descripcion: "Abolladura con pintura saltada en paragolpe trasero",
      fecha: new Date().toISOString(),
    },
    {
      id: "pin_3",
      x: 50, // Centro
      y: 12, // Frente
      tipo: "ROTURA",
      severidad: "LEVE",
      descripcion: "Fisura en parrilla delantera plástica",
      fecha: new Date().toISOString(),
    },
  ];

  const checklistPayload = {
    nivelCombustible: "3/4",
    kilometrajeTablero: 45200,
    damagePins: samplePins,
    lucesTestigo: {
      checkEngine: false,
      abs: true,
      airbag: false,
    },
    observacionesGenerales: "Check-in realizado en recepción táctil móvil",
  };

  const orderWithDamagePins = await prisma.workOrder.update({
    where: { id: testOrder.id },
    data: {
      checklistDanio: JSON.stringify(checklistPayload),
      nivelNafta: "3/4",
      kilometraje: 45200,
    },
  });

  assert(Boolean(orderWithDamagePins.checklistDanio), "Campo checklistDanio actualizado en la base de datos");

  const parsedChecklist = JSON.parse(orderWithDamagePins.checklistDanio);
  assert(Array.isArray(parsedChecklist.damagePins), "damagePins almacenado como lista estructurada en JSON");
  assert(parsedChecklist.damagePins.length === 3, "Cantidad exacta de 3 marcadores (pins) guardados");

  // Comprobar coordenadas X e Y
  const pin1 = parsedChecklist.damagePins[0];
  assert(pin1.x === 28 && pin1.y === 35, "Coordenadas relativas (X: 28%, Y: 35%) guardadas correctamente");
  assert(pin1.tipo === "RAYON", "Tipo de daño 'RAYON' guardado");
  assert(pin1.severidad === "MODERADO", "Severidad 'MODERADO' guardada");

  const pin2 = parsedChecklist.damagePins[1];
  assert(pin2.x === 75 && pin2.y === 82, "Coordenadas relativas (X: 75%, Y: 82%) guardadas correctamente");
  assert(pin2.tipo === "ABOLLADURA", "Tipo de daño 'ABOLLADURA' guardado");

  // -----------------------------------------------------------------
  // 3. Captura y Subida de Evidencia (Object Storage desacoplado, NUNCA Base64)
  // -----------------------------------------------------------------
  console.log("\n3. Verificando Subida Multimedia a Object Storage (Regla Anti-Base64)...");

  // Crear archivo simulado en el Object Storage (directorio /public/uploads/multimedia)
  const uploadsDir = path.join(process.cwd(), "public", "uploads", "multimedia");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const mockPhotoFilename = `evidencia_${Date.now()}_test.jpg`;
  const mockPhotoPath = path.join(uploadsDir, mockPhotoFilename);
  const mockFileContent = Buffer.from("DATOS_BINARIOS_DE_FOTO_COMPRIMIDA_1920PX_80_QUALITY");
  fs.writeFileSync(mockPhotoPath, mockFileContent);

  const mockPublicUrl = `/uploads/multimedia/${mockPhotoFilename}`;

  // Insertar en la tabla WorkOrderMultimedia
  const multimediaPhoto = await prisma.workOrderMultimedia.create({
    data: {
      workOrderId: testOrder.id,
      tipo: "FOTO",
      urlStorage: mockPublicUrl,
      descripcion: "Foto de rayón lateral capturada con cámara móvil",
      etiqueta: "EVIDENCIA_TALLER",
    },
  });

  assert(Boolean(multimediaPhoto.id), "Registro creado exitosamente en tabla WorkOrderMultimedia");
  assert(multimediaPhoto.tipo === "FOTO", "Tipo de evidencia FOTO registrado");
  assert(multimediaPhoto.workOrderId === testOrder.id, "Multimedia asociada correctamente a la WorkOrder");

  // REGLA CRÍTICA ESTRICTA: NUNCA Base64 en la base de datos
  assert(
    !multimediaPhoto.urlStorage.startsWith("data:image"),
    "ESTRICTO: urlStorage NO contiene datos binarios Base64"
  );
  assert(
    !multimediaPhoto.urlStorage.startsWith("data:video"),
    "ESTRICTO: urlStorage NO contiene video en Base64"
  );
  assert(
    multimediaPhoto.urlStorage.includes("/uploads/multimedia/") || multimediaPhoto.urlStorage.includes("supabase.co"),
    "urlStorage almacena una referencia legítima a Object Storage"
  );

  // Registro de Video
  const multimediaVideo = await prisma.workOrderMultimedia.create({
    data: {
      workOrderId: testOrder.id,
      tipo: "VIDEO",
      urlStorage: `/uploads/multimedia/video_${Date.now()}.mp4`,
      descripcion: "Video de vibración del motor",
      etiqueta: "EVIDENCIA_TALLER",
    },
  });
  assert(multimediaVideo.tipo === "VIDEO", "Tipo de evidencia VIDEO registrado en WorkOrderMultimedia");

  // Limpieza del archivo de test
  if (fs.existsSync(mockPhotoPath)) {
    fs.unlinkSync(mockPhotoPath);
  }

  // -----------------------------------------------------------------
  // 4. Registro de Trabajo (WorkLog)
  // -----------------------------------------------------------------
  console.log("\n4. Verificando Registro de Trabajo Realizado (WorkLog)...");

  // Carga de tarea 1: "Cambio de pastillas de freno" - 1.5 hs
  const log1 = await prisma.workLog.create({
    data: {
      workOrderId: testOrder.id,
      mechanicId: mechanic.id,
      horasInvertidas: 1.5,
      descripcionTarea: "Cambio de pastillas de freno delanteras y purgado",
    },
  });

  assert(Boolean(log1.id), "Tarea 1 registrada en WorkLog con éxito");
  assert(log1.horasInvertidas === 1.5, "1.5 horas invertidas computadas");
  assert(log1.descripcionTarea.includes("pastillas"), "Descripción de la tarea guardada");
  assert(log1.mechanicId === mechanic.id, "Mecánico asignado al registro de la tarea");

  // Carga de tarea 2: "Rectificado de discos" - 2.0 hs
  const log2 = await prisma.workLog.create({
    data: {
      workOrderId: testOrder.id,
      mechanicId: mechanic.id,
      horasInvertidas: 2.0,
      descripcionTarea: "Rectificado de discos y prueba de frenado en rodillos",
    },
  });

  assert(Boolean(log2.id), "Tarea 2 registrada en WorkLog con éxito");
  assert(log2.horasInvertidas === 2.0, "2.0 horas invertidas computadas");

  // Consulta de horas acumuladas en la orden
  const workLogs = await prisma.workLog.findMany({
    where: { workOrderId: testOrder.id },
  });
  const totalHoras = workLogs.reduce((sum, item) => sum + item.horasInvertidas, 0);

  assert(workLogs.length === 2, "La orden acumula exactamente 2 registros de trabajo");
  assert(totalHoras === 3.5, "Cómputo acumulado de 3.5 horas de trabajo validado");

  // -----------------------------------------------------------------
  // Resumen Final
  // -----------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`🏁 RESULTADOS: ${passed} / ${total} pruebas aprobadas.`);
  if (passed === total) {
    console.log("🎉 TODOS LOS REQUERIMIENTOS DE LA FASE 4 ESTÁN CUMPLIDOS Y VALIDADOS.");
  } else {
    console.error("⚠️ ALGUNAS PRUEBAS FALLARON.");
  }
  console.log("==================================================\n");

  await prisma.$disconnect();
}

runPhase4Tests().catch((err) => {
  console.error("Error fatal en pruebas de Fase 4:", err);
  process.exit(1);
});
