const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando restablecimiento completo y seed profundo de la base de datos...");

  // 1. Limpieza total de datos existentes
  await prisma.transaction.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.workLog.deleteMany();
  await prisma.part.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.workOrderMultimedia.deleteMany();
  await prisma.workOrder.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenantSettings.deleteMany();

  console.log("Base de datos vaciada con éxito.");

  // 2. Configuración del Taller (Tenant Settings) adaptada a España
  const tenant = await prisma.tenantSettings.create({
    data: {
      tallerNombre: "POGGI Taller Integral",
      whatsapp: "+34 656 40 62 86",
      logoUrl: "/images/poggi/logo.png",
      direccion: "C. de Sant Pius X, 13, 46017 València, España",
      horarios: "Lunes a viernes · 08:00–18:00",
      email: "poggitallerintegral@gmail.com",
      descripcion: "Más de 30 años cuidando tu vehículo en Valencia. Mecánica general, diagnóstico electrónico de precisión, electricidad y climatización.",
      valorHoraManoDeObra: 45.0,
    },
  });

  console.log("TenantSettings creado:", tenant.tallerNombre);

  // 3. Usuarios con Roles RBAC: ADMIN, RECEPTION, MECHANIC
  const passwordHash = await bcrypt.hash("admin123", 10);
  const passwordRecepcion = await bcrypt.hash("recepcion123", 10);
  const passwordMecanico = await bcrypt.hash("mecanico123", 10);

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nombre: "Carlos",
      apellido: "Rossi",
      email: "admin@taller.com",
      passwordHash: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const recepcion = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nombre: "María",
      apellido: "Gómez",
      email: "recepcion@taller.com",
      passwordHash: passwordRecepcion,
      role: "RECEPTION",
      status: "ACTIVE",
    },
  });

  const mecanico1 = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nombre: "Lucas",
      apellido: "Benítez",
      email: "mecanico@taller.com",
      passwordHash: passwordMecanico,
      role: "MECHANIC",
      status: "ACTIVE",
    },
  });

  const mecanico2 = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nombre: "Marcos",
      apellido: "Silva",
      email: "marcos@taller.com",
      passwordHash: passwordMecanico,
      role: "MECHANIC",
      status: "ACTIVE",
    },
  });

  const mecanico3 = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      nombre: "Alejandro",
      apellido: "Torres",
      email: "alejandro@taller.com",
      passwordHash: passwordMecanico,
      role: "MECHANIC",
      status: "ACTIVE",
    },
  });

  console.log("Usuarios y mecánicos creados exitosamente.");

  // 4. Clientes con datos y direcciones completas
  const cliente1 = await prisma.client.create({
    data: {
      nombre: "Federico",
      apellido: "Álvarez",
      dni: "47289123K",
      direccion: "Carrer de Colom 18, 3º B, 46004 València",
      telefono: "+34 611 223 344",
      email: "federico.alvarez@gmail.com",
      status: "ACTIVE",
    },
  });

  const cliente2 = await prisma.client.create({
    data: {
      nombre: "Luciana",
      apellido: "Pérez Moreno",
      dni: "51902341M",
      direccion: "Gran Via de les Corts Valencianes 42, 46015 València",
      telefono: "+34 622 334 455",
      email: "luciana.perez@hotmail.com",
      status: "ACTIVE",
    },
  });

  const cliente3 = await prisma.client.create({
    data: {
      nombre: "Gustavo",
      apellido: "Rivadavia",
      dni: "09445120P",
      direccion: "Avinguda de Blasco Ibáñez 88, 46021 València",
      telefono: "+34 633 445 566",
      email: "g.rivadavia@empresa.es",
      status: "ACTIVE",
    },
  });

  const cliente4 = await prisma.client.create({
    data: {
      nombre: "Carmen",
      apellido: "Navarro Soler",
      dni: "33891204X",
      direccion: "Carrer de Russafa 24, 1º D, 46006 València",
      telefono: "+34 644 556 677",
      email: "carmen.navarro@soluciones.es",
      status: "ACTIVE",
    },
  });

  const cliente5 = await prisma.client.create({
    data: {
      nombre: "Santiago",
      apellido: "Fernández Beltrán",
      dni: "71290384B",
      direccion: "Carrer de Sant Vicent Màrtir 110, 4º C, 46007 València",
      telefono: "+34 655 667 788",
      email: "santiago.fb@yahoo.es",
      status: "ACTIVE",
    },
  });

  // 5. Vehículos con matrículas formato español moderno
  const auto1 = await prisma.vehicle.create({
    data: {
      clientId: cliente1.id,
      marca: "Toyota",
      modelo: "Corolla 1.8 Hybrid Active Tech",
      anio: 2022,
      patente: "4821 KRP",
      nroChasis: "JTNB11BX500342188",
      nroMotor: "2ZR-FXE991823",
      color: "Gris Plata Metalizado",
      status: "ACTIVE",
    },
  });

  const auto2 = await prisma.vehicle.create({
    data: {
      clientId: cliente2.id,
      marca: "Volkswagen",
      modelo: "Golf 1.5 TSI Life 130cv",
      anio: 2020,
      patente: "9034 MDZ",
      nroChasis: "WVWZZZCDZMP042188",
      nroMotor: "DPBA089332",
      color: "Rojo Rubí Tornado",
      status: "ACTIVE",
    },
  });

  const auto3 = await prisma.vehicle.create({
    data: {
      clientId: cliente3.id,
      marca: "Ford",
      modelo: "Kuga 2.0 EcoBlue 4x4 Titanium",
      anio: 2021,
      patente: "1289 HXB",
      nroChasis: "WF0AXXWPMAMC19284",
      nroMotor: "YLCA399201",
      color: "Blanco Oxford Perlado",
      status: "ACTIVE",
    },
  });

  const auto4 = await prisma.vehicle.create({
    data: {
      clientId: cliente4.id,
      marca: "Peugeot",
      modelo: "208 GT PureTech 130 EAT8",
      anio: 2023,
      patente: "6543 CGR",
      nroChasis: "VR3UPHNSSPT991204",
      nroMotor: "HN05-110943",
      color: "Azul Vértigo Tricapa",
      status: "ACTIVE",
    },
  });

  const auto5 = await prisma.vehicle.create({
    data: {
      clientId: cliente5.id,
      marca: "Seat",
      modelo: "León 2.0 TDI FR DSG 150cv",
      anio: 2019,
      patente: "7812 JKL",
      nroChasis: "VSSZZZ5FZKR110822",
      nroMotor: "DFHA-984421",
      color: "Gris Grafito Magnético",
      status: "ACTIVE",
    },
  });

  const auto6 = await prisma.vehicle.create({
    data: {
      clientId: cliente1.id,
      marca: "Renault",
      modelo: "Megane 1.3 TCe Zen 140cv",
      anio: 2022,
      patente: "3391 FTV",
      nroChasis: "VF1RFB00869123847",
      nroMotor: "H5H-B470",
      color: "Negro Cosmos Brillante",
      status: "ACTIVE",
    },
  });

  const auto7 = await prisma.vehicle.create({
    data: {
      clientId: cliente3.id,
      marca: "BMW",
      modelo: "Serie 3 320d Touring M-Sport",
      anio: 2020,
      patente: "0192 LMN",
      nroChasis: "WBA6L31080FJ84912",
      nroMotor: "B47D20B-184CV",
      color: "Azul Estoril Metalizado",
      status: "ACTIVE",
    },
  });

  const auto8 = await prisma.vehicle.create({
    data: {
      clientId: cliente4.id,
      marca: "Audi",
      modelo: "A4 2.0 TFSI S-Tronic",
      anio: 2021,
      patente: "5512 HJK",
      nroChasis: "WAUZZZF43MA081293",
      nroMotor: "CVKB-190CV",
      color: "Gris Nardo",
      status: "ACTIVE",
    },
  });

  const auto9 = await prisma.vehicle.create({
    data: {
      clientId: cliente2.id,
      marca: "Mercedes-Benz",
      modelo: "Clase A 200 AMG Line",
      anio: 2023,
      patente: "8841 MRX",
      nroChasis: "W1K1770871J291844",
      nroMotor: "M282-163CV",
      color: "Blanco Polar",
      status: "ACTIVE",
    },
  });

  // 6. Inventario de Piezas y Repuestos
  const invAceite = await prisma.inventoryItem.create({
    data: {
      nombre: "Aceite Sintético Castrol EDGE 5W30 LL (Garrafa 5L)",
      codigo: "CAS-EDGE-5W30",
      categoria: "Lubricantes y Filtros",
      stock: 14,
      stockMinimo: 4,
      costo: 38.5,
      precioVenta: 62.0,
      archivoFacturaURL: "/uploads/remitos/14db6af7-f1da-461b-9456-3a8c7911e182.webp",
    },
  });

  const invFiltroAceite = await prisma.inventoryItem.create({
    data: {
      nombre: "Filtro de Aceite Mann-Filter HU 7020 z",
      codigo: "MAN-HU7020Z",
      categoria: "Lubricantes y Filtros",
      stock: 22,
      stockMinimo: 5,
      costo: 9.8,
      precioVenta: 18.5,
      archivoFacturaURL: "/uploads/remitos/14db6af7-f1da-461b-9456-3a8c7911e182.webp",
    },
  });

  const invBieleta = await prisma.inventoryItem.create({
    data: {
      nombre: "Bieleta de Barra Estabilizadora Delantera TRW JTS604",
      codigo: "TRW-JTS604",
      categoria: "Suspensión y Dirección",
      stock: 6,
      stockMinimo: 2,
      costo: 24.0,
      precioVenta: 45.0,
      archivoFacturaURL: "/uploads/remitos/d47e0ca1-6871-4356-9576-33b6a09a9b94.jpg",
    },
  });

  const invPastillasFreno = await prisma.inventoryItem.create({
    data: {
      nombre: "Juego Pastillas de Freno Delanteras Brembo P85126",
      codigo: "BRE-P85126",
      categoria: "Frenos",
      stock: 8,
      stockMinimo: 3,
      costo: 35.0,
      precioVenta: 68.0,
      archivoFacturaURL: "/uploads/remitos/d47e0ca1-6871-4356-9576-33b6a09a9b94.jpg",
    },
  });

  const invBujias = await prisma.inventoryItem.create({
    data: {
      nombre: "Juego de 4 Bujías NGK Laser Iridium ILZKR7B11",
      codigo: "NGK-ILZKR7B11",
      categoria: "Encendido e Inyección",
      stock: 12,
      stockMinimo: 4,
      costo: 44.0,
      precioVenta: 82.0,
      archivoFacturaURL: "/uploads/remitos/1de24c77-44dc-4900-a0b0-b7453e14680c.webp",
    },
  });

  // =========================================================================
  // 7. Órdenes de Trabajo con Diversidad de Estados, Peritajes y Textos Extensos
  // =========================================================================

  // ORDEN 1001: EN_REPARACION (Peritaje cerrado completo, mapa con pines, multimedia y worklog)
  const orden1001 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1001,
      vehicleId: auto1.id,
      mechanicId: mecanico1.id,
      adminId: recepcion.id,
      estado: "EN_REPARACION",
      fechaIngreso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      fechaEstimada: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      nivelNafta: "3/4",
      kilometraje: 54300,
      detallesIngreso:
        "Mantenimiento programado de 50.000 km según especificación técnica del fabricante. Vaciado y sustitución de lubricante motor de especificación 0W20 con filtro de aceite, filtro de aire y filtro antipolen de cabina. Diagnóstico integral por crujido metálico intermitente en tren delantero derecho al girar la dirección a tope en maniobras de aparcamiento o superar irregularidades pronunciadas de calzada.",
      comentariosDuenio:
        "El cliente manifiesta que hace tres semanas tuvo un roce leve al maniobrar en un aparcamiento subterráneo estrecho contra una columna de hormigón, dejando un raspón profundo visible en la zona baja del paragolpes delantero derecho y una pequeña abolladura sin desprendimiento de pintura sobre el panel de la puerta trasera derecha. Asimismo, notó una pequeña picadura circular de gravilla en el parabrisas delantero del lado del acompañante en autovía que solicita no manipular.",
      checklistDanio: JSON.stringify({
        fechaHoraPeritaje: "12/10/2026, 09:15:30",
        peritadorNombre: "Lucas Benítez (Mecánico Responsable)",
        estadoPeritaje: "COMPLETADO",
        cerrado: true,
        fechaCierre: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        nivelCombustible: "3/4",
        kilometrajeTablero: 54300,
        comentariosDuenio:
          "El cliente manifiesta que hace tres semanas tuvo un roce leve al maniobrar en un aparcamiento subterráneo estrecho contra una columna de hormigón, dejando un raspón profundo visible en la zona baja del paragolpes delantero derecho y una pequeña abolladura sin desprendimiento de pintura sobre el panel de la puerta trasera derecha. Asimismo, notó una pequeña picadura circular de gravilla en el parabrisas delantero del lado del acompañante en autovía que solicita no manipular.",
        observacionesGenerales:
          "Se corrobora visualmente la picadura de gravilla en el cuadrante inferior derecho del parabrisas (sin fisuras radiales activas). Al elevar el vehículo en el elevador electrohidráulico, se constata rotura del fuelle de goma y marcado juego axial en la rótula de la bieleta de suspensión delantera derecha, origen inequívoco del chasquido denunciado. Resto de rótulas, silentblocks y fuelles homocinéticos en óptimas condiciones.",
        damagePins: [
          {
            id: "pin_1001_1",
            x: 82,
            y: 16,
            tipo: "RAYON",
            severidad: "MODERADO",
            descripcion: "Raspón profundo de 15 cm en zona baja de paragolpe delantero derecho con transferencia de pintura blanca",
            view: "Paragolpe / Frente",
          },
          {
            id: "pin_1001_2",
            x: 80,
            y: 56,
            tipo: "ABOLLADURA",
            severidad: "LEVE",
            descripcion: "Hundimiento leve de 5 cm de diámetro en panel exterior de puerta trasera derecha sin rotura de laca",
            view: "Puerta Tras. Der.",
          },
          {
            id: "pin_1001_3",
            x: 68,
            y: 36,
            tipo: "ROTURA",
            severidad: "LEVE",
            descripcion: "Impacto circular de piedra de 8 mm en cristal parabrisas lado acompañante",
            view: "Parabrisas",
          },
        ],
        daniosCarroceria: [
          {
            zona: "Zócalos / Faldones",
            tipo: "RAYON_RASPON",
            descripcion: "Marcas de rozaduras superficiales por gravilla en estribo inferior derecho",
          },
        ],
        cristalesYOpticas: {
          parabrisasRajado: true,
          opticasDelanterasDanadas: false,
          farosTraserosRotos: false,
          espejosRetrovisoresRotos: false,
        },
        lucesTestigo: {
          checkEngine: false,
          abs: false,
          airbag: false,
          presionAceite: false,
          temperatura: false,
          bateria: false,
          frenoManoDesgaste: false,
          direccionAsistida: false,
          otrosTestigos: "",
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
      }),
      costoManoDeObra: 135.0,
      totalPresupuesto: 260.5,
    },
  });

  // ORDEN 1002: EN_ESPERA_REPUESTOS (En Pausa, con repuestos pedidos y textos largos de diagnóstico)
  const orden1002 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1002,
      vehicleId: auto2.id,
      mechanicId: mecanico2.id,
      adminId: recepcion.id,
      estado: "EN_ESPERA_REPUESTOS",
      fechaIngreso: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      fechaEstimada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      nivelNafta: "1/4",
      kilometraje: 88750,
      detallesIngreso:
        "Sustitución de conjunto de correa de distribución dentada, rodillo tensor excéntrico, polea guía y bomba de agua variable. Vehículo ingresa además con pérdida de líquido refrigerante por termostato y testigo de avería motor encendido en cuadro instrumental.",
      comentariosDuenio:
        "La propietaria indica que el vehículo presenta un pequeño toque de aparcamiento en la esquina trasera izquierda con rotura del catadióptrico rojo inferior. También advierte que el retrovisor exterior izquierdo tiene la moldura plástica superior floja por un encontronazo en calle estrecha, aunque el espejo y su regulación eléctrica funcionan.",
      checklistDanio: JSON.stringify({
        fechaHoraPeritaje: "10/10/2026, 11:20:45",
        peritadorNombre: "Marcos Silva (Mecánico)",
        estadoPeritaje: "COMPLETADO",
        cerrado: true,
        fechaCierre: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        nivelCombustible: "1/4",
        kilometrajeTablero: 88750,
        comentariosDuenio:
          "La propietaria indica que el vehículo presenta un pequeño toque de aparcamiento en la esquina trasera izquierda con rotura del catadióptrico rojo inferior. También advierte que el retrovisor exterior izquierdo tiene la moldura plástica superior floja por un encontronazo en calle estrecha, aunque el espejo y su regulación eléctrica funcionan.",
        observacionesGenerales:
          "Se verifica catadióptrico inferior partido y raspón en paragolpes trasero. Carcasa de espejo retrovisor izquierdo con grapas de sujeción partidas. El cliente no deja el gato elevador ni la tuerca de seguridad en el hueco de la rueda de repuesto, se deja expresa constancia en acta.",
        damagePins: [
          {
            id: "pin_1002_1",
            x: 22,
            y: 89,
            tipo: "ROTURA",
            severidad: "MODERADO",
            descripcion: "Catadióptrico reflectante trasero izquierdo fracturado y esquina de paragolpes raspada",
            view: "Paragolpe Trasero",
          },
          {
            id: "pin_1002_2",
            x: 15,
            y: 45,
            tipo: "ROTURA",
            severidad: "LEVE",
            descripcion: "Carcasa plástica exterior de espejo retrovisor izquierdo desencajada por rotura de patillas",
            view: "Espejo Izquierdo",
          },
        ],
        daniosCarroceria: [],
        cristalesYOpticas: {
          parabrisasRajado: false,
          opticasDelanterasDanadas: false,
          farosTraserosRotos: true,
          espejosRetrovisoresRotos: true,
        },
        lucesTestigo: {
          checkEngine: true,
          abs: false,
          airbag: false,
          presionAceite: false,
          temperatura: false,
          bateria: false,
          frenoManoDesgaste: true,
          direccionAsistida: false,
          otrosTestigos: "Testigo Check Engine activo por código P0016 (desincronización de árbol de levas) y aviso de pastillas desgastadas",
        },
        inventarioCabina: {
          ruedaAuxilio: true,
          criqueYHerramientas: false,
          tuercaSeguridad: false,
          documentacion: true,
          estereoFunciona: true,
          matafuegoVigente: false,
          tapaCombustible: true,
        },
      }),
      costoManoDeObra: 180.0,
      totalPresupuesto: 460.0,
    },
  });

  // ORDEN 1003: FINALIZADO (Trabajo mecánico concluido, probado, listo para entrega)
  const orden1003 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1003,
      vehicleId: auto3.id,
      mechanicId: mecanico3.id,
      adminId: admin.id,
      estado: "FINALIZADO",
      fechaIngreso: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      fechaEstimada: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      fechaEntrega: null,
      nivelNafta: "LLENO",
      kilometraje: 42100,
      detallesIngreso:
        "Revisión integral de sistema de frenos: sustitución completa de discos ventilados delanteros de 316 mm y juego de pastillas cerámicas de alto rendimiento. Sustitución y purga de líquido de frenos con fluido sintético DOT 4 Low Viscosity y calibración por diagnosis del freno de estacionamiento eléctrico automático.",
      comentariosDuenio:
        "El titular indica que no tiene conocimiento de desperfectos en chapa o pintura, el vehículo duerme siempre en garaje cerrado individual. Pide comprobar el equilibrado de las cuatro ruedas porque notaba vibraciones en volante a 120 km/h.",
      checklistDanio: JSON.stringify({
        fechaHoraPeritaje: "08/10/2026, 16:45:00",
        peritadorNombre: "Alejandro Torres (Mecánico)",
        estadoPeritaje: "COMPLETADO",
        cerrado: true,
        fechaCierre: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        nivelCombustible: "LLENO",
        kilometrajeTablero: 42100,
        comentariosDuenio:
          "El titular indica que no tiene conocimiento de desperfectos en chapa o pintura, el vehículo duerme siempre en garaje cerrado individual. Pide comprobar el equilibrado de las cuatro ruedas porque notaba vibraciones en volante a 120 km/h.",
        observacionesGenerales:
          "Carrocería en estado de conservación sobresaliente. Discos delanteros desgastados con reborde exterior cortante de 2 mm por debajo de la cota mínima admisible. Se detecta desequilibrado de 25 gramos en neumático delantero derecho, se procede a su rectificación en equilibradora dinámica.",
        damagePins: [],
        daniosCarroceria: [],
        cristalesYOpticas: {
          parabrisasRajado: false,
          opticasDelanterasDanadas: false,
          farosTraserosRotos: false,
          espejosRetrovisoresRotos: false,
        },
        lucesTestigo: {
          checkEngine: false,
          abs: false,
          airbag: false,
          presionAceite: false,
          temperatura: false,
          bateria: false,
          frenoManoDesgaste: false,
          direccionAsistida: false,
          otrosTestigos: "",
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
      }),
      costoManoDeObra: 110.0,
      totalPresupuesto: 313.0,
    },
  });

  // ORDEN 1004: PENDIENTE_PERITAJE (Sin peritaje previo, ideal para probar el flujo de inspección de ingreso)
  const orden1004 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1004,
      vehicleId: auto4.id,
      mechanicId: null, // Sin mecánico asignado todavía para testear la regla de asignación obligatoria
      adminId: recepcion.id,
      estado: "PENDIENTE_PERITAJE",
      fechaIngreso: new Date(Date.now() - 3 * 60 * 60 * 1000), // Hace 3 horas
      fechaEstimada: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      nivelNafta: "1/2",
      kilometraje: 29800,
      detallesIngreso:
        "Ingreso en plataforma de asistencia en carretera. Testigo de avería de sistema anticontaminación AdBlue encendido de forma persistente con cuenta regresiva en el cuadro: 'Arranque imposible en 850 km'. Se requiere peritaje legal previo a cualquier intervención de taller para certificar el estado de la unidad.",
      comentariosDuenio:
        "La cliente declara que al salir del parking rozó la aleta delantera izquierda con una columna y rayó ligeramente la llanta de aleación diamantada. También manifiesta que la luz de aviso de AdBlue apareció de improviso tras repostar en estación de servicio de autopista.",
      checklistDanio: null, // Pendiente de realizar
      costoManoDeObra: 0,
      totalPresupuesto: 0,
    },
  });

  // ORDEN 1005: ENTREGADO (Orden completada, entregada con firma, pagada y archivada)
  const orden1005 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1005,
      vehicleId: auto5.id,
      mechanicId: mecanico1.id,
      adminId: admin.id,
      estado: "ENTREGADO",
      fechaIngreso: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      fechaEstimada: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fechaEntrega: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      nivelNafta: "3/4",
      kilometraje: 71500,
      detallesIngreso:
        "Sustitución de conjunto de volante bimasa de inercia y kit de embrague con cojinete hidráulico de empuje concéntrico. Eliminación de vibraciones en ralentí y marcha de embrague dura.",
      comentariosDuenio:
        "El cliente no declara desperfectos estéticos previos al ingreso.",
      checklistDanio: JSON.stringify({
        fechaHoraPeritaje: "02/10/2026, 08:30:12",
        peritadorNombre: "Lucas Benítez (Mecánico)",
        estadoPeritaje: "COMPLETADO",
        cerrado: true,
        fechaCierre: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        nivelCombustible: "3/4",
        kilometrajeTablero: 71500,
        comentariosDuenio: "Sin daños declarados.",
        observacionesGenerales: "Vehículo en óptimo estado de carrocería. Prueba dinámica satisfactoria.",
        damagePins: [],
        daniosCarroceria: [],
        cristalesYOpticas: {
          parabrisasRajado: false,
          opticasDelanterasDanadas: false,
          farosTraserosRotos: false,
          espejosRetrovisoresRotos: false,
        },
        lucesTestigo: {
          checkEngine: false,
          abs: false,
          airbag: false,
          presionAceite: false,
          temperatura: false,
          bateria: false,
          frenoManoDesgaste: false,
          direccionAsistida: false,
          otrosTestigos: "",
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
      }),
      costoManoDeObra: 220.0,
      totalPresupuesto: 640.0,
    },
  });

  // ORDEN 1006: EN_REPARACION (Segundo caso activo con texto muy largo y múltiples anomalías)
  const orden1006 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1006,
      vehicleId: auto6.id,
      mechanicId: mecanico2.id,
      adminId: recepcion.id,
      estado: "EN_REPARACION",
      fechaIngreso: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      fechaEstimada: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      nivelNafta: "1/2",
      kilometraje: 63400,
      detallesIngreso:
        "Diagnosis computarizada por tirones bruscos y fallos de encendido a 2.500 RPM en aceleraciones sostenidas. Sustitución de las cuatro bobinas de encendido directas y bujías de iridio NGK. Limpieza con ultrasonido y descarbonización del colector de admisión y cuerpo mariposa motorizado.",
      comentariosDuenio:
        "El titular indica que el capó presenta varios impactos pequeños de granizo de una tormenta veraniega. En la puerta del acompañante hay un rayón longitudinal de llave de aproximadamente 20 centímetros y la óptica delantera izquierda acumula humedad y condensación interior en días de lluvia.",
      checklistDanio: JSON.stringify({
        fechaHoraPeritaje: "13/10/2026, 15:40:00",
        peritadorNombre: "Marcos Silva (Mecánico Responsable)",
        estadoPeritaje: "COMPLETADO",
        cerrado: true,
        fechaCierre: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        nivelCombustible: "1/2",
        kilometrajeTablero: 63400,
        comentariosDuenio:
          "El titular indica que el capó presenta varios impactos pequeños de granizo de una tormenta veraniega. En la puerta del acompañante hay un rayón longitudinal de llave de aproximadamente 20 centímetros y la óptica delantera izquierda acumula humedad y condensación interior en días de lluvia.",
        observacionesGenerales:
          "Se verifican 4 marcas de granizo en el panel del capot. El rayón de la puerta del acompañante ha penetrado la laca superficial alcanzando la imprimación. La óptica delantera izquierda presenta un poro en la junta termosellada superior por donde ingresa agua de lluvia.",
        damagePins: [
          {
            id: "pin_1006_1",
            x: 50,
            y: 28,
            tipo: "ABOLLADURA",
            severidad: "LEVE",
            descripcion: "Pequeños impactos circulares de granizo en centro del capot",
            view: "Capot / Frente",
          },
          {
            id: "pin_1006_2",
            x: 82,
            y: 48,
            tipo: "RAYON",
            severidad: "GRAVE",
            descripcion: "Rayón profundo de llave de 20 cm en chapa de puerta acompañante",
            view: "Puerta Del. Der.",
          },
          {
            id: "pin_1006_3",
            x: 28,
            y: 20,
            tipo: "ROTURA",
            severidad: "MODERADO",
            descripcion: "Fisura en sellado de faro delantero izquierdo con condensación interior",
            view: "Ópticas Delanteras",
          },
        ],
        daniosCarroceria: [
          {
            zona: "Paragolpe Delantero",
            tipo: "GOLPE_ABOLLADURA",
            descripcion: "Toque de estacionamiento con deformación plástica en faldón inferior",
          },
        ],
        cristalesYOpticas: {
          parabrisasRajado: false,
          opticasDelanterasDanadas: true,
          farosTraserosRotos: false,
          espejosRetrovisoresRotos: false,
        },
        lucesTestigo: {
          checkEngine: true,
          abs: false,
          airbag: false,
          presionAceite: false,
          temperatura: false,
          bateria: false,
          frenoManoDesgaste: false,
          direccionAsistida: false,
          otrosTestigos: "Luz Check Engine parpadeante en aceleración fuerte (código DTC P0300 fallo múltiple de combustión)",
        },
        inventarioCabina: {
          ruedaAuxilio: true,
          criqueYHerramientas: true,
          tuercaSeguridad: false,
          documentacion: true,
          estereoFunciona: true,
          matafuegoVigente: true,
          tapaCombustible: true,
        },
      }),
      costoManoDeObra: 90.0,
      totalPresupuesto: 215.0,
    },
  });

  // ORDEN 1007: PENDIENTE_PERITAJE (Con mecánico ya asignado, listo para hacer peritaje)
  const orden1007 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1007,
      vehicleId: auto7.id,
      mechanicId: mecanico3.id,
      adminId: recepcion.id,
      estado: "PENDIENTE_PERITAJE",
      fechaIngreso: new Date(Date.now() - 1 * 60 * 60 * 1000), // Hace 1 hora
      fechaEstimada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      nivelNafta: "VACIO",
      kilometraje: 95200,
      detallesIngreso:
        "Fuga severa de líquido refrigerante por manguito superior de radiador y caja de termostato de distribución. El vehículo se detuvo de inmediato en ruta para evitar sobrecalentamiento de culata.",
      comentariosDuenio:
        "Declara que el vehículo está libre de golpes, salvo rasguños mínimos en los bajos del paragolpes delantero por roces en badenes de urbanización.",
      checklistDanio: null,
      costoManoDeObra: 0,
      totalPresupuesto: 0,
    },
  });

  // ORDEN 1008: CANCELADO (Dada de baja / Cancelada con motivo documentado de desistimiento)
  const orden1008 = await prisma.workOrder.create({
    data: {
      numeroOrden: 1008,
      vehicleId: auto8.id,
      mechanicId: mecanico1.id,
      adminId: admin.id,
      estado: "CANCELADO",
      fechaIngreso: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      fechaCancelacion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      motivoCancelacion:
        "El titular decide no afrontar la reparación integral de la mecatrónica de transmisión en este período por presupuesto elevado. Se entrega en grúa particular sin costo devengado.",
      nivelNafta: "1/4",
      kilometraje: 110400,
      detallesIngreso:
        "Fallo y tirones en transmisión automática S-Tronic en marchas pares. Presupuesto de sustitución de módulo mecatrónico.",
      comentariosDuenio: "Notó tirones al pasar a 2da y 4ta marcha en ciudad.",
      checklistDanio: JSON.stringify({
        motivoCancelacion:
          "El titular decide no afrontar la reparación integral de la mecatrónica de transmisión en este período por presupuesto elevado. Se entrega en grúa particular sin costo devengado.",
        fechaCancelacion: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        responsableCancelacion: "Carlos Rossi (Administrador)",
      }),
      costoManoDeObra: 0,
      totalPresupuesto: 0,
    },
  });

  console.log("Órdenes de trabajo creadas (1001 a 1008) abarcando todos los estados.");

  // =========================================================================
  // 8. Piezas Asignadas a Órdenes (Parts)
  // =========================================================================
  await prisma.part.createMany({
    data: [
      {
        workOrderId: orden1001.id,
        inventoryItemId: invAceite.id,
        nombreRepuesto: "Aceite Sintético Castrol EDGE 5W30 LL (Garrafa 5L)",
        codigo: "CAS-EDGE-5W30",
        cantidad: 1,
        costo: 38.5,
        precioVenta: 62.0,
        archivoFacturaURL: "/uploads/remitos/14db6af7-f1da-461b-9456-3a8c7911e182.webp",
      },
      {
        workOrderId: orden1001.id,
        inventoryItemId: invFiltroAceite.id,
        nombreRepuesto: "Filtro de Aceite Mann-Filter HU 7020 z",
        codigo: "MAN-HU7020Z",
        cantidad: 1,
        costo: 9.8,
        precioVenta: 18.5,
        archivoFacturaURL: "/uploads/remitos/14db6af7-f1da-461b-9456-3a8c7911e182.webp",
      },
      {
        workOrderId: orden1001.id,
        inventoryItemId: invBieleta.id,
        nombreRepuesto: "Bieleta de Barra Estabilizadora Delantera TRW JTS604",
        codigo: "TRW-JTS604",
        cantidad: 1,
        costo: 24.0,
        precioVenta: 45.0,
        archivoFacturaURL: "/uploads/remitos/d47e0ca1-6871-4356-9576-33b6a09a9b94.jpg",
      },
      {
        workOrderId: orden1002.id,
        nombreRepuesto: "Kit de Distribución y Bomba de Agua Continental CT1168WP1",
        codigo: "CON-CT1168WP1",
        cantidad: 1,
        costo: 145.0,
        precioVenta: 220.0,
        archivoFacturaURL: "/uploads/remitos/1de24c77-44dc-4900-a0b0-b7453e14680c.webp",
      },
      {
        workOrderId: orden1002.id,
        inventoryItemId: invPastillasFreno.id,
        nombreRepuesto: "Juego Pastillas de Freno Delanteras Brembo P85126",
        codigo: "BRE-P85126",
        cantidad: 1,
        costo: 35.0,
        precioVenta: 60.0,
        archivoFacturaURL: "/uploads/remitos/d47e0ca1-6871-4356-9576-33b6a09a9b94.jpg",
      },
      {
        workOrderId: orden1003.id,
        nombreRepuesto: "Juego Discos de Freno Delanteros Brembo Coated 09.C397.13",
        codigo: "BRE-09C39713",
        cantidad: 1,
        costo: 95.0,
        precioVenta: 145.0,
        archivoFacturaURL: "/uploads/remitos/d47e0ca1-6871-4356-9576-33b6a09a9b94.jpg",
      },
      {
        workOrderId: orden1003.id,
        inventoryItemId: invPastillasFreno.id,
        nombreRepuesto: "Juego Pastillas de Freno Delanteras Ferodo Racing",
        codigo: "FER-FDB4434",
        cantidad: 1,
        costo: 38.0,
        precioVenta: 58.0,
        archivoFacturaURL: "/uploads/remitos/d47e0ca1-6871-4356-9576-33b6a09a9b94.jpg",
      },
      {
        workOrderId: orden1006.id,
        inventoryItemId: invBujias.id,
        nombreRepuesto: "Juego de 4 Bujías NGK Laser Iridium ILZKR7B11",
        codigo: "NGK-ILZKR7B11",
        cantidad: 1,
        costo: 44.0,
        precioVenta: 82.0,
        archivoFacturaURL: "/uploads/remitos/1de24c77-44dc-4900-a0b0-b7453e14680c.webp",
      },
      {
        workOrderId: orden1006.id,
        nombreRepuesto: "Bobina de Encendido Bosch 0221604033 (Unidad)",
        codigo: "BOS-0221604033",
        cantidad: 4,
        costo: 18.0,
        precioVenta: 32.0,
        archivoFacturaURL: "/uploads/remitos/1de24c77-44dc-4900-a0b0-b7453e14680c.webp",
      },
    ],
  });

  // =========================================================================
  // 9. Horas y Tareas Mecánicas Registradas (WorkLogs)
  // =========================================================================
  await prisma.workLog.createMany({
    data: [
      {
        workOrderId: orden1001.id,
        mechanicId: mecanico1.id,
        horasInvertidas: 1.5,
        descripcionTarea:
          "Elevación de unidad en puesto 1. Desmontaje de rueda delantera derecha, extracción de tuerca de bieleta gripada con soplete de inducción y montaje de nueva bieleta TRW con par de apriete dinamométrico homologado.",
        fechaRegistro: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1001.id,
        mechanicId: mecanico1.id,
        horasInvertidas: 1.0,
        descripcionTarea:
          "Vaciado de aceite motor en caliente. Sustitución de arandela de cobre de tapón de cárter, cambio de elemento filtrante Mann con engrase de junta y llenado de 4.2 L de lubricante Castrol EDGE 5W30. Reset de intervalo de servicio.",
        fechaRegistro: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1002.id,
        mechanicId: mecanico2.id,
        horasInvertidas: 2.5,
        descripcionTarea:
          "Desmontaje de frontal, faro derecho y paso de rueda. Desmontaje de soporte pendular de motor. Retiro de correa de accesorios auxiliar y calado de árboles de levas con útiles de sincronización.",
        fechaRegistro: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1003.id,
        mechanicId: mecanico3.id,
        horasInvertidas: 2.0,
        descripcionTarea:
          "Sustitución de discos de freno ventilados y pastillas delanteras. Limpieza por ultrasonido y cepillado de guías de pinza, aplicación de grasa cerámica antichirridos en apoyos de pastilla.",
        fechaRegistro: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1003.id,
        mechanicId: mecanico3.id,
        horasInvertidas: 1.0,
        descripcionTarea:
          "Purga completa de líquido de frenos circuito por circuito con purgador neumático a 1.5 bar de presión. Calibración básica de actuadores de pinzas de freno de mano eléctrico con diagnosis Autel.",
        fechaRegistro: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1005.id,
        mechanicId: mecanico1.id,
        horasInvertidas: 4.5,
        descripcionTarea:
          "Desmontaje completo de caja de cambios manual de 6 velocidades. Extracción de volante bimasa fatigado y plato de presión de embrague. Montaje de conjunto Sachs nuevo, purga de bombín hidráulico y prueba en carretera.",
        fechaRegistro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1006.id,
        mechanicId: mecanico2.id,
        horasInvertidas: 2.0,
        descripcionTarea:
          "Lectura con diagnosis OBD2 de parámetros en vivo de encendido y presión de rail. Desmontaje de bobinas cil. 1-4 y bujías desgastadas con holgura de electrodo excesiva (1.3 mm).",
        fechaRegistro: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ],
  });

  // =========================================================================
  // 10. Multimedia de Peritaje y Evidencias Fotográficas
  // =========================================================================
  await prisma.workOrderMultimedia.createMany({
    data: [
      // Orden 1001
      {
        workOrderId: orden1001.id,
        tipo: "FOTO",
        urlStorage: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80",
        descripcion: "Peritaje de ingreso: Odómetro verificado con 54.300 km y nivel de combustible 3/4",
        etiqueta: "PERITAJE_INGRESO",
        fechaCarga: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1001.id,
        tipo: "FOTO",
        urlStorage: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
        descripcion: "Peritaje de ingreso: Detalle de raspón profundo en aleta y esquina inferior de paragolpes delantero derecho",
        etiqueta: "PERITAJE_INGRESO",
        fechaCarga: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1001.id,
        tipo: "FOTO",
        urlStorage: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
        descripcion: "Evidencia mecánica: Fuelle rajado y juego axial en rótula de bieleta derecha",
        etiqueta: "REPUESTO_ROTO",
        fechaCarga: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1001.id,
        tipo: "FOTO",
        urlStorage: "/uploads/multimedia/636dd962-f3eb-41ea-bebb-894e0abef773.jpg",
        descripcion: "Foto de estado general de la carrocería en puesto de elevador",
        etiqueta: "DURANTE",
        fechaCarga: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },

      // Orden 1002
      {
        workOrderId: orden1002.id,
        tipo: "FOTO",
        urlStorage: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=800&q=80",
        descripcion: "Peritaje de ingreso: Correa de distribución con estrías desgastadas y grietas transversales",
        etiqueta: "PERITAJE_INGRESO",
        fechaCarga: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1002.id,
        tipo: "FOTO",
        urlStorage: "/uploads/multimedia/6a54142e-08d4-43e8-868e-bc6f712bad22.jpg",
        descripcion: "Peritaje de ingreso: Daño en catadióptrico trasero izquierdo preexistente",
        etiqueta: "PERITAJE_INGRESO",
        fechaCarga: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },

      // Orden 1003
      {
        workOrderId: orden1003.id,
        tipo: "FOTO",
        urlStorage: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
        descripcion: "Peritaje de ingreso: Inspección exterior de llantas y discos de freno",
        etiqueta: "PERITAJE_INGRESO",
        fechaCarga: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1003.id,
        tipo: "FOTO",
        urlStorage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
        descripcion: "Inspección final de calidad: Montaje concluido y vehículo limpio para entrega",
        etiqueta: "FINALIZADO",
        fechaCarga: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },

      // Orden 1006
      {
        workOrderId: orden1006.id,
        tipo: "FOTO",
        urlStorage: "/uploads/multimedia/d7277d52-184c-4702-b975-b8c44f70b182.jpg",
        descripcion: "Peritaje de ingreso: Detalle de rayón en puerta derecha y marcas en capó",
        etiqueta: "PERITAJE_INGRESO",
        fechaCarga: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1006.id,
        tipo: "FOTO",
        urlStorage: "/uploads/multimedia/6d37240d-df63-4096-badf-4ecf30df2436.jpg",
        descripcion: "Diagnosis: Lectura de códigos DTC de fallo de bobinas de encendido",
        etiqueta: "DURANTE",
        fechaCarga: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ],
  });

  // =========================================================================
  // 11. Transacciones Financieras (Ingresos, Cobros y Pagos a Proveedores)
  // =========================================================================
  await prisma.transaction.createMany({
    data: [
      {
        workOrderId: orden1005.id,
        clienteId: cliente5.id,
        monto: 640.0,
        tipo: "INGRESO",
        concepto: "Cobro total de Orden #1005 - Sustitución de kit de embrague y bimasa",
        categoria: "COBRO_ORDEN",
        metodoPago: "TRANSFERENCIA",
        comprobanteNro: "FAC-2026-0089",
        observaciones: "Transferencia bancaria recibida y confirmada por administración.",
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1001.id,
        clienteId: cliente1.id,
        monto: 100.0,
        tipo: "INGRESO",
        concepto: "Seña / Anticipo Orden #1001 - Mantenimiento y tren delantero",
        categoria: "SENIA",
        metodoPago: "TARJETA_DEBITO",
        comprobanteNro: "TPV-994120",
        observaciones: "Abono inicial en recepción al momento del ingreso.",
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        workOrderId: orden1002.id,
        clienteId: cliente2.id,
        monto: 150.0,
        tipo: "INGRESO",
        concepto: "Anticipo de compra de repuestos para Orden #1002 - Kit distribución",
        categoria: "SENIA",
        metodoPago: "EFECTIVO",
        comprobanteNro: "REC-00104",
        observaciones: "Pago en efectivo en mostrador.",
        fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        monto: 340.0,
        tipo: "EGRESO",
        concepto: "Pago factura proveedor Recambios Levante Valencia - Pedido distribución y aceites",
        categoria: "PAGO_PROVEEDOR",
        metodoPago: "TRANSFERENCIA",
        comprobanteNro: "TRANSF-REC-8841",
        observaciones: "Pago de remito de material para órdenes 1001 y 1002.",
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        monto: 85.0,
        tipo: "EGRESO",
        concepto: "Compra de suministros de taller: aerosoles desengrasantes, guantes nitrilo y trapos",
        categoria: "GASTO_OPERATIVO",
        metodoPago: "TARJETA_CREDITO",
        comprobanteNro: "FAC-SUM-1102",
        observaciones: "Reposición quincenal de consumibles de taller.",
        fecha: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // =========================================================================
  // 12. Logs de Auditoría
  // =========================================================================
  await prisma.auditLog.createMany({
    data: [
      {
        userId: recepcion.id,
        userEmail: recepcion.email,
        userName: `${recepcion.nombre} ${recepcion.apellido}`,
        accion: "CREATE",
        entidad: "WorkOrders",
        entidadAfectada: "WorkOrders",
        entidadId: orden1001.id,
        valores: JSON.stringify({ numeroOrden: 1001, vehiculo: "4821 KRP", cliente: "Federico Álvarez" }),
        detallesCambio: JSON.stringify({ motivo: "Recepción de vehículo en mostrador y apertura de orden" }),
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: mecanico1.id,
        userEmail: mecanico1.email,
        userName: `${mecanico1.nombre} ${mecanico1.apellido}`,
        accion: "UPDATE",
        entidad: "WorkOrders",
        entidadAfectada: "WorkOrders",
        entidadId: orden1001.id,
        valores: JSON.stringify({ estado: "EN_REPARACION", peritaje: "COMPLETADO" }),
        detallesCambio: JSON.stringify({ motivo: "Constatación y cierre de acta de peritaje de ingreso e inicio de tareas" }),
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      },
      {
        userId: mecanico2.id,
        userEmail: mecanico2.email,
        userName: `${mecanico2.nombre} ${mecanico2.apellido}`,
        accion: "UPDATE",
        entidad: "WorkOrders",
        entidadAfectada: "WorkOrders",
        entidadId: orden1002.id,
        valores: JSON.stringify({ estadoAnterior: "EN_REPARACION", estadoNuevo: "ESPERANDO_REPUESTOS" }),
        detallesCambio: JSON.stringify({ motivo: "Pausa por espera de kit de bomba de agua y distribución" }),
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: admin.id,
        userEmail: admin.email,
        userName: `${admin.nombre} ${admin.apellido}`,
        accion: "UPDATE",
        entidad: "WorkOrders",
        entidadAfectada: "WorkOrders",
        entidadId: orden1005.id,
        valores: JSON.stringify({ estado: "ENTREGADO", fechaEntrega: new Date().toISOString() }),
        detallesCambio: JSON.stringify({ motivo: "Entrega conforme del vehículo al cliente y liquidación completa" }),
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("¡Seed profundo completado con éxito!");
  console.log(`Resumen de entidades creadas:
  - 1 Configuración de Taller (Valencia, España)
  - 5 Usuarios (1 Admin, 1 Recepción, 3 Mecánicos)
  - 5 Clientes con direcciones completas
  - 9 Vehículos con matrículas españolas modernas (incluye vehículos sin órdenes y vehículos con órdenes finalizadas)
  - 5 Artículos en Inventario
  - 8 Órdenes de Trabajo (1001 a 1008) en TODOS los estados operativos y comerciales:
      * 1001: EN_REPARACION (Peritaje cerrado, 3 pines de carrocería, parabrisas rajado, 4 fotos, worklogs, repuestos)
      * 1002: EN_ESPERA_REPUESTOS (En Pausa, catadióptrico y espejo roto, check engine encendido, 2 fotos, worklog)
      * 1003: FINALIZADO (Terminado/Listo, peritaje limpio, discos brembo montados, 2 fotos; listo para probar nueva orden)
      * 1004: PENDIENTE_PERITAJE (Sin mecánico asignado, peritaje pendiente, texto de queja largo)
      * 1005: ENTREGADO (Archivado, entregado al cliente con pago registrado)
      * 1006: EN_REPARACION (Diagnosis electrónica, rayón de llave y granizo, bobinas bosch, fotos)
      * 1007: PENDIENTE_PERITAJE (Con mecánico asignado, fuga de refrigerante, pendiente de inspección técnica)
      * 1008: CANCELADO (Dada de baja / cancelada con motivo legal y de auditoría documentado)
  - 9 Repuestos asignados con archivos de factura
  - 7 Registros de horas y tareas de mecánicos (WorkLogs)
  - 10 Fotografías de peritaje y evidencia multimedia
  - 5 Transacciones financieras (ingresos y gastos)
  - 4 Registros de auditoría legal
  `);
}

main()
  .catch((e) => {
    console.error("Error al ejecutar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
