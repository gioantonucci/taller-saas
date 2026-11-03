import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, normalizeRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { isSparePartEscalated, getFechaUltimoEstado } from "@/lib/spare-parts-config";

export const dynamic = "force-dynamic";

/**
 * GET /api/spare-parts
 * Lista los pedidos de repuestos con filtros y control de permisos por rol.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = normalizeRole(session.role);
    const { searchParams } = new URL(request.url);

    const workOrderId = searchParams.get("workOrderId");
    const estado = searchParams.get("estado");
    const mechanicId = searchParams.get("mechanicId");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const where: any = {};

    // 1. Filtrado por rol:
    // El mecánico solo debe poder ver los pedidos que él ha realizado
    if (role === "MECHANIC") {
      where.mechanicId = session.id;
    } else if (mechanicId && mechanicId !== "TODOS") {
      where.mechanicId = mechanicId;
    }

    // 2. Filtro por orden específica
    if (workOrderId) {
      where.workOrderId = workOrderId;
    }

    // 3. Filtro por estado
    if (estado && estado !== "TODOS") {
      where.estado = estado;
    }

    // 4. Búsqueda por patente o número de orden
    if (search) {
      const isNum = !isNaN(Number(search));
      where.workOrder = {
        ...(where.workOrder || {}),
        OR: [
          { vehicle: { patente: { contains: search, mode: "insensitive" } } },
          ...(isNum ? [{ numeroOrden: Number(search) }] : []),
        ],
      };
    }

    const requests = await prisma.sparePartRequest.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        workOrder: {
          select: {
            id: true,
            numeroOrden: true,
            estado: true,
            vehicle: {
              select: {
                id: true,
                patente: true,
                marca: true,
                modelo: true,
                client: {
                  select: {
                    id: true,
                    nombre: true,
                    apellido: true,
                    telefono: true,
                  },
                },
              },
            },
            mechanic: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                email: true,
              },
            },
          },
        },
        mechanic: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
          },
        },
      },
    });

    // Ordenar por prioridad según especificación:
    // Los pedidos escalados (en rojo) primero, luego los que llevan más tiempo esperando
    const sorted = [...requests].sort((a, b) => {
      const aEscalated = isSparePartEscalated(a);
      const bEscalated = isSparePartEscalated(b);
      if (aEscalated && !bEscalated) return -1;
      if (!aEscalated && bEscalated) return 1;

      const dateA = getFechaUltimoEstado(a).getTime();
      const dateB = getFechaUltimoEstado(b).getTime();
      return dateA - dateB;
    });

    return NextResponse.json(sorted);
  } catch (error: any) {
    console.error("Error al obtener pedidos de repuestos:", error);
    return NextResponse.json(
      { error: "Error interno al obtener pedidos de repuestos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/spare-parts
 * Crea un nuevo pedido de repuestos.
 * Restricciones:
 * - Rol: Solo MECANICO (sobre su orden asignada).
 * - Orden: Debe estar en estado "En reparación" (EN_REPARACION / EN_CURSO).
 * - Datos obligatorios: "qué se va a reparar" (fallaReparar) y al menos 1 ítem con descripción y cantidad.
 * - Efecto colateral: La orden pasa automáticamente a "En espera" (EN_ESPERA_REPUESTOS) con motivo "repuesto".
 * - Auditoría: Registro inalterable en AuditLog.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = normalizeRole(session.role);
    if (role !== "MECHANIC" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Permiso denegado: solo el mecánico asignado puede crear un pedido de repuestos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      workOrderId,
      fallaReparar,
      itemsSolicitados,
      repuestosLista,
      observacionesMecanico,
      fotos,
      fotoUrl,
    } = body;

    if (!workOrderId) {
      return NextResponse.json(
        { error: "El ID de la orden de trabajo es obligatorio" },
        { status: 400 }
      );
    }

    // 1. Validar que la orden exista y esté en reparación
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        vehicle: true,
        mechanic: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    // Validar asignación del mecánico si el usuario es mecánico
    if (role === "MECHANIC" && workOrder.mechanicId && workOrder.mechanicId !== session.id) {
      return NextResponse.json(
        { error: "Solo el mecánico asignado a esta orden puede pedir repuestos" },
        { status: 403 }
      );
    }

    // Validar estado de la orden (debe estar en reparación)
    const isEnReparacion =
      workOrder.estado === "EN_REPARACION" ||
      workOrder.estado === "EN_CURSO" ||
      workOrder.estado === "PERITADO";

    if (!isEnReparacion) {
      return NextResponse.json(
        {
          error: `Un pedido de repuestos solo se puede crear sobre una orden en estado 'En reparación'. El estado actual de la orden es '${workOrder.estado}'.`,
        },
        { status: 400 }
      );
    }

    // 2. Validar qué se va a reparar (obligatorio)
    if (!fallaReparar || typeof fallaReparar !== "string" || !fallaReparar.trim()) {
      return NextResponse.json(
        { error: "El campo '¿Qué se va a reparar con los repuestos?' es obligatorio" },
        { status: 400 }
      );
    }

    // 3. Validar lista de ítems solicitados (al menos 1 ítem con descripción y cantidad > 0)
    let parsedItems: any[] = [];
    if (Array.isArray(itemsSolicitados) && itemsSolicitados.length > 0) {
      parsedItems = itemsSolicitados
        .filter((it: any) => it && (it.descripcion || it.nombre))
        .map((it: any, idx: number) => ({
          id: it.id || `item-${Date.now()}-${idx}`,
          descripcion: (it.descripcion || it.nombre || "").trim(),
          cantidad: Math.max(1, Number(it.cantidad) || 1),
        }));
    } else if (typeof repuestosLista === "string" && repuestosLista.trim()) {
      // Soporte retrocompatible si se envía un texto libre con saltos de línea
      parsedItems = repuestosLista
        .split("\n")
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          descripcion: line,
          cantidad: 1,
        }));
    }

    if (parsedItems.length === 0) {
      return NextResponse.json(
        { error: "Debe ingresar al menos un repuesto solicitado con su descripción y cantidad" },
        { status: 400 }
      );
    }

    // Generar texto resumen de la lista para retrocompatibilidad
    const summaryLista = parsedItems
      .map((it) => `• ${it.cantidad}x ${it.descripcion}`)
      .join("\n");

    // Procesar fotos con notas ancladas si existen
    let parsedFotos: any[] = [];
    if (Array.isArray(fotos)) {
      parsedFotos = fotos
        .filter((f: any) => f && (f.url || typeof f === "string"))
        .map((f: any, idx: number) => {
          if (typeof f === "string") {
            return {
              id: `foto-${Date.now()}-${idx}`,
              url: f.trim(),
              nota: "",
              fecha: new Date().toISOString(),
            };
          }
          return {
            id: f.id || `foto-${Date.now()}-${idx}`,
            url: f.url.trim(),
            nota: f.nota?.trim() || "",
            fecha: f.fecha || new Date().toISOString(),
          };
        });
    } else if (fotoUrl && typeof fotoUrl === "string" && fotoUrl.trim()) {
      parsedFotos.push({
        id: `foto-${Date.now()}-0`,
        url: fotoUrl.trim(),
        nota: "Foto de repuesto dañado",
        fecha: new Date().toISOString(),
      });
    }

    // 4. Crear el pedido en estado SOLICITADO
    const newRequest = await prisma.sparePartRequest.create({
      data: {
        workOrderId,
        mechanicId: session.id,
        fallaReparar: fallaReparar.trim(),
        repuestosLista: summaryLista,
        itemsSolicitados: JSON.stringify(parsedItems),
        observacionesMecanico: observacionesMecanico?.trim() || null,
        fotoUrl: parsedFotos[0]?.url || null,
        fotos: parsedFotos.length > 0 ? JSON.stringify(parsedFotos) : null,
        estado: "SOLICITADO",
      },
      include: {
        workOrder: {
          include: {
            vehicle: true,
            mechanic: true,
          },
        },
        mechanic: true,
      },
    });

    // 5. Pasar la orden automáticamente a EN_ESPERA_REPUESTOS con motivo "repuesto"
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        estado: "EN_ESPERA_REPUESTOS",
        fechaCambioEstado: new Date(),
      },
    });

    // Anexar fotos a WorkOrderMultimedia para conservar el historial fotográfico de la orden
    for (const foto of parsedFotos) {
      try {
        await prisma.workOrderMultimedia.create({
          data: {
            workOrderId,
            tipo: "FOTO",
            urlStorage: foto.url,
            etiqueta: "REPUESTO_ROTO",
            descripcion: `Pausa por repuesto: ${fallaReparar.trim()}${foto.nota ? ` - Nota: ${foto.nota}` : ""}`,
          },
        });
      } catch (e) {
        console.warn("Aviso al anexar evidencia multimedia:", e);
      }
    }

    // 6. Registro inalterable en AuditLog
    await recordAuditLog({
      user: session,
      accion: "CREATE_SPARE_PART_REQUEST",
      entidad: "SparePartRequest",
      entidadAfectada: "WorkOrders",
      entidadId: newRequest.id,
      valores: {
        pedidoId: newRequest.id,
        ordenId: workOrderId,
        numeroOrden: workOrder.numeroOrden,
        patente: workOrder.vehicle?.patente,
        estado: "SOLICITADO",
        fallaReparar: fallaReparar.trim(),
        itemsSolicitados: parsedItems,
        fotosCount: parsedFotos.length,
        motivoPausaOrden: "repuesto",
        descripcion: `Mecánico ${session.nombre} ${session.apellido || ""} solicitó repuestos para Orden #${workOrder.numeroOrden} (${workOrder.vehicle?.patente}). La orden pasa a En Espera.`,
      },
    });

    return NextResponse.json(
      {
        message: "Pedido de repuestos creado con éxito. La orden pasó a 'En espera'.",
        request: newRequest,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error al crear pedido de repuestos:", error);
    return NextResponse.json(
      { error: "Error interno al crear pedido de repuestos: " + error.message },
      { status: 500 }
    );
  }
}
