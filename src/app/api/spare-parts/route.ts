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

    // 4. Búsqueda por patente, orden, repuesto o proveedor
    if (search) {
      const isNum = !isNaN(Number(search));
      where.OR = [
        { fallaReparar: { contains: search, mode: "insensitive" } },
        { proveedor: { contains: search, mode: "insensitive" } },
        { repuestosLista: { contains: search, mode: "insensitive" } },
        {
          workOrder: {
            OR: [
              { vehicle: { patente: { contains: search, mode: "insensitive" } } },
              ...(isNum ? [{ numeroOrden: Number(search) }] : []),
            ],
          },
        },
      ];
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
 * Crea un nuevo pedido / encargue de repuestos.
 * Restricciones y comportamiento:
 * - Rol: MECANICO (sobre su orden asignada), RECEPCION o ADMIN.
 * - Recepción y Admin pueden anclar el encargo a una orden creada y opcionalmente pausar el vehículo
 *   (o crearlo sin anclar como pedido general de taller).
 * - Mecánico: Debe asociar a su orden en reparación; la orden pasa a 'EN_ESPERA_REPUESTOS'.
 * - Recepción / Admin: Puede establecer proveedor, fecha estimada, y marcar directamente como 'ENCARGO_REALIZADO' o 'PARA_ENCARGAR'.
 * - Auditoría: Registro inalterable en AuditLog.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = normalizeRole(session.role);
    if (role !== "MECHANIC" && role !== "ADMIN" && role !== "RECEPTION") {
      return NextResponse.json(
        { error: "Permiso denegado: solo personal autorizado puede gestionar pedidos de repuestos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      workOrderId,
      fallaReparar,
      motivo,
      descripcion,
      itemsSolicitados,
      repuestosLista,
      itemsAEncargar,
      observacionesMecanico,
      proveedor,
      fechaEstimadaLlegada,
      pausarVehiculo,
      marcarComoEncargado,
      fotos,
      fotoUrl,
    } = body;

    let targetWorkOrder: any = null;
    if (workOrderId) {
      targetWorkOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          vehicle: {
            include: {
              client: true,
            },
          },
          mechanic: true,
        },
      });

      if (!targetWorkOrder) {
        return NextResponse.json(
          { error: "Orden de trabajo no encontrada" },
          { status: 404 }
        );
      }

      // Validaciones específicas para mecánicos
      if (role === "MECHANIC") {
        if (targetWorkOrder.mechanicId && targetWorkOrder.mechanicId !== session.id) {
          return NextResponse.json(
            { error: "Solo el mecánico asignado a esta orden puede pedir repuestos" },
            { status: 403 }
          );
        }

        const isEnReparacion =
          targetWorkOrder.estado === "EN_REPARACION" ||
          targetWorkOrder.estado === "EN_CURSO" ||
          targetWorkOrder.estado === "PERITADO";

        if (!isEnReparacion) {
          return NextResponse.json(
            {
              error: `Un pedido de repuestos solo se puede crear sobre una orden en estado 'En reparación'. El estado actual de la orden es '${targetWorkOrder.estado}'.`,
            },
            { status: 400 }
          );
        }
      }
    } else {
      if (role === "MECHANIC") {
        return NextResponse.json(
          { error: "El mecánico debe asociar el pedido a una orden de trabajo" },
          { status: 400 }
        );
      }
    }

    // Determinar motivo / falla
    const motivoFinal = (
      fallaReparar ||
      motivo ||
      descripcion ||
      (targetWorkOrder
        ? `Repuestos para Orden #${targetWorkOrder.numeroOrden} (${targetWorkOrder.vehicle?.patente || "S/P"})`
        : "Encargue de repuestos / Stock de taller")
    ).trim();

    // Validar lista de ítems (al menos 1 ítem con descripción y cantidad)
    const rawItems = itemsAEncargar || itemsSolicitados || repuestosLista;
    let parsedItems: any[] = [];
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      parsedItems = rawItems
        .filter((it: any) => it && (it.descripcion || it.nombre))
        .map((it: any, idx: number) => ({
          id: it.id || `item-${Date.now()}-${idx}`,
          descripcion: (it.descripcion || it.nombre || "").trim(),
          cantidad: Math.max(1, Number(it.cantidad) || 1),
        }));
    } else if (typeof rawItems === "string" && rawItems.trim()) {
      parsedItems = rawItems
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
        { error: "Debe ingresar al menos un repuesto con su descripción y cantidad" },
        { status: 400 }
      );
    }

    const summaryLista = parsedItems
      .map((it) => `• ${it.cantidad}x ${it.descripcion}`)
      .join("\n");

    // Procesar fotos si existen
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
        nota: "Foto de repuesto",
        fecha: new Date().toISOString(),
      });
    }

    // Determinar estado inicial y metadatos según el rol creador
    let estadoInicial = "SOLICITADO";
    let encargadoPor = null;
    let fechaEncargo = null;
    let fechaRevision = null;
    let adminId = null;

    if (role === "ADMIN" || role === "RECEPTION") {
      if (role === "ADMIN") {
        adminId = session.id;
        fechaRevision = new Date();
      }

      // Si se especifica proveedor o marcarComoEncargado, entra como ENCARGO_REALIZADO
      if (marcarComoEncargado || (proveedor && proveedor.trim())) {
        estadoInicial = "ENCARGO_REALIZADO";
        encargadoPor = `${session.nombre} ${session.apellido || ""}`.trim();
        fechaEncargo = new Date();
      } else {
        estadoInicial = "PARA_ENCARGAR";
      }
    }

    const newRequest = await prisma.sparePartRequest.create({
      data: {
        workOrderId: targetWorkOrder ? targetWorkOrder.id : null,
        mechanicId: targetWorkOrder?.mechanicId || (role === "MECHANIC" ? session.id : null),
        adminId,
        fallaReparar: motivoFinal,
        repuestosLista: summaryLista,
        itemsSolicitados: JSON.stringify(parsedItems),
        itemsAEncargar: role !== "MECHANIC" ? JSON.stringify(parsedItems) : null,
        itemsProcesados: role !== "MECHANIC" ? JSON.stringify(parsedItems) : null,
        observacionesMecanico: observacionesMecanico?.trim() || null,
        proveedor: proveedor?.trim() || null,
        fechaEstimadaLlegada: fechaEstimadaLlegada ? new Date(fechaEstimadaLlegada) : null,
        encargadoPor,
        fechaEncargo,
        fechaRevision,
        fotoUrl: parsedFotos[0]?.url || null,
        fotos: parsedFotos.length > 0 ? JSON.stringify(parsedFotos) : null,
        estado: estadoInicial,
      },
      include: {
        workOrder: {
          include: {
            vehicle: true,
            mechanic: true,
          },
        },
        mechanic: true,
        admin: true,
      },
    });

    // Pausar orden de trabajo si corresponde:
    // Para mecánico siempre pausa. Para Recepción/Admin, pausa si pausarVehiculo === true (o no viene false si fue solicitado explícitamente)
    const debePausar =
      targetWorkOrder &&
      (role === "MECHANIC" || pausarVehiculo === true);

    if (debePausar) {
      await prisma.workOrder.update({
        where: { id: targetWorkOrder.id },
        data: {
          estado: "EN_ESPERA_REPUESTOS",
          fechaCambioEstado: new Date(),
        },
      });
    }

    // Anexar fotos si hay orden
    if (targetWorkOrder) {
      for (const foto of parsedFotos) {
        try {
          await prisma.workOrderMultimedia.create({
            data: {
              workOrderId: targetWorkOrder.id,
              tipo: "FOTO",
              urlStorage: foto.url,
              etiqueta: "REPUESTO_ROTO",
              descripcion: `Pausa por repuesto: ${motivoFinal}${foto.nota ? ` - Nota: ${foto.nota}` : ""}`,
            },
          });
        } catch (e) {
          console.warn("Aviso al anexar evidencia multimedia:", e);
        }
      }
    }

    // Registro inalterable en AuditLog
    await recordAuditLog({
      user: session,
      accion: "CREATE_SPARE_PART_REQUEST",
      entidad: "SparePartRequest",
      entidadAfectada: "WorkOrders",
      entidadId: newRequest.id,
      valores: {
        pedidoId: newRequest.id,
        ordenId: targetWorkOrder?.id || null,
        numeroOrden: targetWorkOrder?.numeroOrden || null,
        patente: targetWorkOrder?.vehicle?.patente || null,
        estado: estadoInicial,
        fallaReparar: motivoFinal,
        itemsSolicitados: parsedItems,
        proveedor: proveedor?.trim() || null,
        pausoVehiculo: !!debePausar,
        creadoPorRol: role,
        descripcion: `${role === "RECEPTION" ? "Recepción" : role === "ADMIN" ? "Administrador" : "Mecánico"} ${session.nombre} ${session.apellido || ""} creó encargue de repuestos #${newRequest.id.slice(-4)}${targetWorkOrder ? ` para Orden #${targetWorkOrder.numeroOrden} (${targetWorkOrder.vehicle?.patente || "S/P"})` : " (general)"}.${debePausar ? " La orden pasó a 'En Pausa / Esperando repuestos'." : ""}`,
      },
    });

    return NextResponse.json(
      {
        message: `Encargue de repuestos creado con éxito.${debePausar ? " La orden pasó a 'En espera de repuestos'." : ""}`,
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
