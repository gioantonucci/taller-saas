# 🚗 AutoTaller SaaS - Sistema Integral de Gestión para Talleres Automotores

> **Estado:** Fase Beta / MVP Funcional Completo  
> **Objetivo:** Digitalización integral de la operación del taller mecánico, eliminando el uso de papel, resguardando peritajes fotográficos en la nube con compresión en el cliente, gestionando repuestos mediante OCR y auditando cada movimiento en tiempo real con control de acceso basado en roles (RBAC).

---

## 🛠️ Stack Tecnológico & Arquitectura

* **Frontend:** Next.js 14 (App Router) + React 18 + TypeScript.
* **Diseño UI/UX:** Tailwind CSS + Lucide Icons.
  * **Mecánico:** Interfaz *Mobile-First* optimizada para celulares y tablets en taller (pantallas de checklist, cámara y registro de horas).
  * **Recepción / Admin / Dueño:** Vistas *Desktop-First* con métricas ejecutivas, búsqueda rápida por DNI/Patente, tablas interactivas y visor de auditoría.
* **Backend & Base de Datos:** Next.js API Routes + Prisma ORM con SQLite out-of-the-box (compatible con PostgreSQL / Supabase).
* **Almacenamiento Multimedia (Crítico):** Arquitectura desacoplada de Object Storage (`/api/upload` hacia `/public/uploads/multimedia` y `/remitos`). La base de datos relacional almacena estrictamente URLs (`urlStorage`), sin guardar binarios ni base64 en tablas.
* **Compresión en el Cliente (Mobile-First):** Utilidad con HTML5 Canvas (`src/lib/client-compress.ts`) que reduce hasta un 85% el peso de las fotos tomadas en el taller antes de enviarlas al servidor.
* **Autenticación & Seguridad:**
  * Tokens JWT firmados con `jose` en cookies `HttpOnly`.
  * Hashing de contraseñas con `bcryptjs`.
  * **Prevención de fuerza bruta:** Bloqueo temporal automático por 15 minutos tras 5 intentos fallidos consecutivos.
  * **Auto-cierre de sesión por inactividad:** Temporizador de 30 minutos sin actividad.
* **OCR de Remitos & Facturas:** Reconocimiento de texto y extracción heurística de repuestos, códigos, cantidades y costos unitarios con exportación a Excel/CSV.
* **Presupuestador PDF:** Generación en el cliente con `jspdf` y `jspdf-autotable` unificando mano de obra, repuestos, garantía legal y membrete del taller.

---

## 🔐 Roles y Credenciales de Demostración (RBAC)

La plataforma incluye datos de prueba pre-cargados y un **Simulador Rápido de Roles (1-Click Switcher)** tanto en la pantalla de login como en la barra lateral del sistema:

| Rol | Usuario (Email) | Contraseña | Permisos y Alcance |
| :--- | :--- | :--- | :--- |
| **Dueño / Admin** | `admin@taller.com` | `admin123` | **Acceso Total:** Métricas financieras (facturación, márgenes), Monitoreo en vivo de mecánicos, Registro de Auditoría inalterable con visor JSON diff, gestión de clientes, vehículos y órdenes. |
| **Recepción / Admin** | `recepcion@taller.com` | `recepcion123` | **Gestión Operativa:** Ingreso rápido por DNI/Patente, carga y escaneo OCR de remitos, generador de presupuestos en PDF, CRUD de clientes y vehículos. *(Sin acceso a finanzas globales ni auditoría)*. |
| **Mecánico** | `mecanico@taller.com`<br>`marcos@taller.com` | `mecanico123` | **Vista Mobile-First:** Hoja de ruta técnica (`/app/taller/hoja-ruta`), peritaje inicial interactivo (rayones, accesorios y nivel de combustible), captura de evidencias con compresión y carga de horas. *(Restringido: sin acceso a precios ni datos de facturación)*. |

---

## 🗺️ Enrutamiento y Deep Linking

### 🌐 Sitio Público (SEO Friendly)
* `/` - Landing Page institucional con los 4 pilares tecnológicos, vista previa de la app, testimonios, mapa de Google Maps y botón flotante de WhatsApp.
* `/servicios` - Catálogo completo de servicios mecánicos (inyección, distribución, frenos, service preventivo).
* `/contacto` - Información de ubicación, horarios de taller, formulario interactivo de consulta y Google Maps embebido.

### 🔒 Aplicación Interna Protegida
* `/app/login` - Inicio de sesión seguro con protección contra fuerza bruta y selector de roles demo.
* `/app/dashboard` - Métricas operativas, distribución de estados y apertura rápida de órdenes de trabajo.
* `/app/taller/hoja-ruta` - Panel móvil del mecánico para peritaje, fotos de evidencia y horas.
* `/app/ordenes` - Listado general de órdenes con filtros de estado y búsqueda.
* `/app/ordenes/[id]` - Ficha integral de la orden con repuestos, mano de obra, fotos y descarga de Presupuesto PDF.
* `/app/clientes` - Directorio de clientes con búsqueda por DNI o nombre.
* `/app/clientes/[id]` - Ficha detallada del cliente, vehículos asociados, valor de cuenta y baja lógica (Soft Delete).
* `/app/vehiculos` - Directorio del parque automotor por patente.
* `/app/vehiculos/[patente]` - Ficha e historial clínico completo del auto: timeline de servicios, repuestos históricos instalados y galería de peritajes.
* `/app/repuestos/ocr` - Escáner OCR de facturas/remitos físicos con edición en vivo y vinculación directa a órdenes activas.
* `/app/admin/monitoreo` - Seguimiento en vivo de mecánicos (auto actual, horas del día, última tarea).
* `/app/admin/auditoria` - Historial inalterable de movimientos con filtros por módulo/acción, visor de diff JSON antes/después y exportación CSV.

---

## 🚀 Puesta en Marcha en Local

### 1. Requisitos Previos
* Node.js v18+ (probado en Node v24).
* npm o yarn.

### 2. Instalación de Dependencias
```bash
npm install
```

### 3. Inicializar Base de Datos y Cargar Datos Iniciales (Seed)
```bash
# Sincronizar esquema de Prisma con SQLite
npm run db:push

# Poblar usuarios demo, clientes, autos, órdenes, repuestos y logs de auditoría
npm run db:seed
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Características No Funcionales Implementadas

1. **Separación de Multimedia:** Las imágenes y comprobantes se resguardan en almacenamiento de objetos independiente; en la base de datos sólo persisten sus URLs permanentes.
2. **Compresión en Navegador:** Reducción de resolución y compresión JPEG en canvas antes del envío HTTP, ahorrando transferencia de datos móviles.
3. **Baja Lógica (Soft Delete):** Clientes y vehículos mantienen integridad referencial histórica cambiando su estado a `INACTIVE` sin romper los historiales de auditoría ni órdenes de trabajo.
4. **Middleware de Auditoría Automático:** Todos los endpoints de mutación (`CREATE`, `UPDATE`, `SOFT_DELETE`, `UPLOAD_MULTIMEDIA`, `LOGIN`) registran automáticamente los estados previo y nuevo en la tabla `AuditLog`.
