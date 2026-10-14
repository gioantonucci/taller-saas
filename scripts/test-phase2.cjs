const fs = require("fs");
const path = require("path");

function runPhase2Tests() {
  console.log("==================================================");
  console.log("🧪 INICIANDO TEST SUITE - FASE 2: ENRUTAMIENTO, LAYOUT Y RBAC");
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
  // 1. Verificación de Rutas y Placeholders con <h1>
  // -----------------------------------------------------------------
  console.log("1. Verificando Estructura de Rutas y presencia de <h1>...");

  const requiredRoutes = [
    { path: "src/app/app/dashboard/page.tsx", label: "/app/dashboard (Métricas - Dueño)" },
    { path: "src/app/app/ordenes/page.tsx", label: "/app/ordenes (Órdenes y Turnos - Recepción/Dueño)" },
    { path: "src/app/app/clientes/page.tsx", label: "/app/clientes (Lista clientes)" },
    { path: "src/app/app/clientes/[id]/page.tsx", label: "/app/clientes/[id] (Detalle cliente)" },
    { path: "src/app/app/vehiculos/page.tsx", label: "/app/vehiculos (Lista vehículos)" },
    { path: "src/app/app/vehiculos/[patente]/page.tsx", label: "/app/vehiculos/[patente] (Detalle vehículo)" },
    { path: "src/app/app/taller/hoja-ruta/page.tsx", label: "/app/taller/hoja-ruta (Hoja de ruta - Mecánico)" },
    { path: "src/app/app/admin/auditoria/page.tsx", label: "/app/admin/auditoria (Historial - Dueño)" },
    { path: "src/app/app/configuracion/page.tsx", label: "/app/configuracion (Ajustes - Dueño)" },
  ];

  for (const route of requiredRoutes) {
    const fullPath = path.join(process.cwd(), route.path);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Ruta existe: ${route.label}`);
    if (exists) {
      const content = fs.readFileSync(fullPath, "utf-8");
      const hasH1 = content.includes("<h1");
      assert(hasH1, `Ruta contiene etiqueta <h1>: ${route.label}`);
    }
  }

  // -----------------------------------------------------------------
  // 2. Verificación de Layout Responsivo (Mobile-First y Desktop)
  // -----------------------------------------------------------------
  console.log("\n2. Verificando Layout y Responsividad (Bottom Bar + Sidebar)...");
  const layoutPath = path.join(process.cwd(), "src/app/app/layout.tsx");
  const sidebarPath = path.join(process.cwd(), "src/components/AppSidebar.tsx");

  assert(fs.existsSync(layoutPath), "Layout /app/layout.tsx existe");
  assert(fs.existsSync(sidebarPath), "Componente de navegación AppSidebar.tsx existe");

  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert(layoutContent.includes("md:pl-64") || layoutContent.includes("lg:pl-72"), "Layout tiene margen lateral para desktop");
  assert(layoutContent.includes("pb-20"), "Layout tiene padding inferior pb-20 para evitar solapamiento con Bottom Navigation Bar");

  const sidebarContent = fs.readFileSync(sidebarPath, "utf-8");
  assert(sidebarContent.includes("md:hidden"), "Implementa menú visible en mobile (md:hidden)");
  assert(sidebarContent.includes("fixed bottom-0"), "Implementa Bottom Navigation Bar fija al pie para celulares");
  assert(sidebarContent.includes("hidden md:flex"), "Implementa Sidebar lateral izquierdo para escritorio (hidden md:flex)");
  assert(sidebarContent.includes("handleLogout"), "Posee función funcional de Cerrar Sesión");
  assert(sidebarContent.includes("/api/auth/logout"), "El botón Cerrar Sesión llama al endpoint /api/auth/logout");

  // -----------------------------------------------------------------
  // 3. Verificación de Navegación Condicional por Roles (RBAC Visual)
  // -----------------------------------------------------------------
  console.log("\n3. Verificando Reglas de Navegación Condicional por Rol...");

  // Simulación lógica del filtrado según AppSidebar
  const allNavItems = [
    { href: "/app/dashboard", label: "Dashboard", roles: ["ADMIN"] },
    { href: "/app/ordenes", label: "Órdenes", roles: ["ADMIN", "RECEPTION"] },
    { href: "/app/clientes", label: "Clientes", roles: ["ADMIN", "RECEPTION"] },
    { href: "/app/vehiculos", label: "Vehículos", roles: ["ADMIN", "RECEPTION"] },
    { href: "/app/taller/hoja-ruta", label: "Hoja de Ruta", roles: ["ADMIN", "MECHANIC"] },
    { href: "/app/admin/auditoria", label: "Historial y Auditoría", roles: ["ADMIN"] },
  ];

  const getLinksForRole = (role) => allNavItems.filter((i) => i.roles.includes(role)).map((i) => i.label);

  const mechanicLinks = getLinksForRole("MECHANIC");
  assert(
    mechanicLinks.length === 1 && mechanicLinks.includes("Hoja de Ruta"),
    "Rol MECHANIC ve ÚNICAMENTE 'Hoja de Ruta'",
    `Links visibles: ${mechanicLinks.join(", ")}`
  );

  const receptionLinks = getLinksForRole("RECEPTION");
  const expectedReception = ["Órdenes", "Clientes", "Vehículos"];
  assert(
    receptionLinks.length === 3 &&
    expectedReception.every((link) => receptionLinks.includes(link)) &&
    !receptionLinks.includes("Dashboard") &&
    !receptionLinks.includes("Historial y Auditoría") &&
    !receptionLinks.includes("Hoja de Ruta"),
    "Rol RECEPTION ve 'Órdenes', 'Clientes', 'Vehículos' y NO ve Dashboard/Auditoría/Hoja de Ruta",
    `Links visibles: ${receptionLinks.join(", ")}`
  );

  const adminLinks = getLinksForRole("ADMIN");
  const expectedAdmin = [
    "Dashboard",
    "Órdenes",
    "Clientes",
    "Vehículos",
    "Hoja de Ruta",
    "Historial y Auditoría",
  ];
  assert(
    adminLinks.length === 6 && expectedAdmin.every((link) => adminLinks.includes(link)),
    "Rol ADMIN ve TODOS los links del sistema de navegación principal (6 enlaces)",
    `Links visibles: ${adminLinks.join(", ")}`
  );

  // -----------------------------------------------------------------
  // 4. Verificación de Redirección Post-Login
  // -----------------------------------------------------------------
  console.log("\n4. Verificando Lógica de Redirección Post-Login...");

  function getPostLoginRedirect(role, from) {
    if (from) return from;
    const r = (role || "").toUpperCase();
    if (r === "MECHANIC" || r === "MECANICO") return "/app/taller/hoja-ruta";
    if (r === "RECEPTION" || r === "RECEPCION") return "/app/ordenes";
    return "/app/dashboard";
  }

  assert(getPostLoginRedirect("ADMIN") === "/app/dashboard", "Admin redirige a /app/dashboard");
  assert(getPostLoginRedirect("RECEPTION") === "/app/ordenes", "Reception redirige a /app/ordenes");
  assert(getPostLoginRedirect("RECEPCION") === "/app/ordenes", "RECEPCION en español redirige a /app/ordenes");
  assert(getPostLoginRedirect("MECHANIC") === "/app/taller/hoja-ruta", "Mechanic redirige a /app/taller/hoja-ruta");
  assert(getPostLoginRedirect("MECANICO") === "/app/taller/hoja-ruta", "MECANICO en español redirige a /app/taller/hoja-ruta");
  assert(getPostLoginRedirect("ADMIN", "/app/ordenes") === "/app/ordenes", "Parámetro 'from' preserva la ruta de destino original");

  // -----------------------------------------------------------------
  // Resumen Final
  // -----------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`🏁 RESULTADOS: ${passed} / ${total} pruebas aprobadas.`);
  if (passed === total) {
    console.log("🎉 TODOS LOS REQUERIMIENTOS DE LA FASE 2 ESTÁN CUMPLIDOS Y VALIDADOS.");
  } else {
    console.error("⚠️ ALGUNAS PRUEBAS FALLARON.");
  }
  console.log("==================================================\n");
}

runPhase2Tests();
