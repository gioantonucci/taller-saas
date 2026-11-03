import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, normalizeRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * GET /api/spare-parts/[id]
 * Consulta el detalle completo de un pedido de repuestos.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = normalizeRole(session.role);
    const { id } = params;

    let req = await prisma.sparePartRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: {
            vehicle: {
              include: {
                client: true,
              },
            },
            mechanic: true,
            admin: true,
          },
        },
        mechanic: true,
        admin: true,
      },
    });

    if (!req) {
      return NextResponse.json(
        { error: "Pedido de repuestos no encontrado" },
        { status: 404 }
      );
    }

    // Control de permisos: El mecánico solo puede consultar sus propios pedidos
    if (role === "MECHANIC") {
      const isOwner =
        req.mechanicId === session.id || req.workOrder?.mechanicId === session.id;
      if (!isOwner) {
        return NextResponse.json(
          { error: "Permiso denegado: solo puedes consultar pedidos de tus órdenes" },
          { status: 403 }
        );
      }
    }

    // Devolver el detalle directamente sin mutaciones de estado ni bloqueos
    return NextResponse.json(req);
  } catch (error: any) {
    console.error("Error al consultar pedido de repuestos:", error);
    return NextResponse.json(
      { error: "Error al consultar pedido: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/spare-parts/[id]
 * Gestiona las transiciones de estado y modificaciones del pedido según la matriz de permisos.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const role = normalizeRole(session.role);
    const { id } = params;

    const existingReq = await prisma.sparePartRequest.findUnique({
      where: { id },
      include: {
        workOrder: {
          include: {
            vehicle: true,
            mechanic: true,
          },
        },
      },
    });

    if (!existingReq) {
      return NextResponse.json(
        { error: "Pedido de repuestos no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const action = body.action || body.accion;
    const updateData: any = {};
    const auditDetails: any = {
      pedidoId: id,
      ordenNumero: existingReq.workOrder?.numeroOrden,
      patente: existingReq.workOrder?.vehicle?.patente,
      estadoAnterior: existingReq.estado,
    };

    // =========================================================================
    // ACCIÓN 1: POSPONER RECORDATORIO ("Todavía no")
    // =========================================================================
    if (action === "POSPONER" || action === "TODAVIA_NO") {
      if (role !== "RECEPTION" && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo Recepción o Administrador pueden responder el recordatorio" },
          { status: 403 }
        );
      }

      let posposicionesList: any[] = [];
      try {
        if (existingReq.posposiciones) {
          posposicionesList = JSON.parse(existingReq.posposiciones);
        }
      } catch {
        posposicionesList = [];
      }

      const tipoPosposicion = body.tipo === "LLEGADA" ? "LLEGADA" : "ENCARGO";
      const nuevaPosposicion = {
        usuario: `${session.nombre} ${session.apellido || ""}`.trim(),
        usuarioId: session.id,
        fecha: new Date().toISOString(),
        tipo: tipoPosposicion,
      };

      posposicionesList.push(nuevaPosposicion);
      updateData.posposiciones = JSON.stringify(posposicionesList);

      const updated = await prisma.sparePartRequest.update({
        where: { id },
        data: updateData,
      });

      await recordAuditLog({
        user: session,
        accion: "POSTPONE_SPARE_PART_REMINDER",
        entidad: "SparePartRequest",
        entidadAfectada: "WorkOrders",
        entidadId: id,
        valores: {
          ...auditDetails,
          tipo: tipoPosposicion,
          descripcion: `Recepción pospuso el recordatorio ('Todavía no') para el pedido #${id.slice(-4)} (${tipoPosposicion})`,
        },
      });

      return NextResponse.json({
        message: "Recordatorio pospuesto registrado en auditoría",
        request: updated,
      });
    }

    // =========================================================================
    // ACCIÓN 2: CANCELAR PEDIDO
    // Permisos: Admin en cualquier estado anterior a RECIBIDO.
    // Mecánico solo en SOLICITADO.
    // Requiere motivo obligatorio.
    // =========================================================================
    if (action === "CANCELAR" || body.estado === "CANCELADO") {
      const motivo = body.motivoCancelacion?.trim() || body.motivo?.trim();
      if (!motivo) {
        return NextResponse.json(
          { error: "El motivo de cancelación es obligatorio" },
          { status: 400 }
        );
      }

      if (existingReq.estado === "RECIBIDO") {
        return NextResponse.json(
          { error: "No se puede cancelar un pedido de repuestos que ya fue marcado como 'Recibido'" },
          { status: 400 }
        );
      }

      if (role === "MECHANIC") {
        if (existingReq.estado !== "SOLICITADO") {
          return NextResponse.json(
            { error: "El mecánico solo puede cancelar un pedido cuando está en estado 'Solicitado'" },
            { status: 403 }
          );
        }
        if (existingReq.mechanicId !== session.id) {
          return NextResponse.json(
            { error: "Solo el mecánico que creó el pedido puede cancelarlo" },
            { status: 403 }
          );
        }
      } else if (role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo el Administrador (o el Mecánico en Solicitado) puede cancelar pedidos" },
          { status: 403 }
        );
      }

      updateData.estado = "CANCELADO";
      updateData.motivoCancelacion = motivo;
      updateData.canceladoPor = `${session.nombre} ${session.apellido || ""}`.trim();
      updateData.fechaCancelacion = new Date();

      auditDetails.estadoNuevo = "CANCELADO";
      auditDetails.motivo = motivo;
      auditDetails.descripcion = `Pedido #${id.slice(-4)} cancelado por ${session.nombre}. Motivo: ${motivo}`;
    }

    // =========================================================================
    // ACCIÓN 2.5: GUARDAR / EDITAR ÍTEMS SIN CAMBIAR ESTADO (Admin)
    // =========================================================================
    else if (action === "EDITAR_ITEMS" || action === "GUARDAR_ITEMS") {
      if (role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo el Administrador puede editar los repuestos" },
          { status: 403 }
        );
      }

      const itemsAEncargar = body.itemsAEncargar || body.itemsProcesados;
      let parsedItems: any[] = [];
      if (Array.isArray(itemsAEncargar)) {
        parsedItems = itemsAEncargar
          .filter((it: any) => it && (it.descripcion || it.nombre))
          .map((it: any, idx: number) => ({
            id: it.id || `item-encargar-${Date.now()}-${idx}`,
            descripcion: (it.descripcion || it.nombre || "").trim(),
            cantidad: Math.max(1, Number(it.cantidad) || 1),
          }));
      }

      if (parsedItems.length === 0) {
        return NextResponse.json(
          { error: "Debe ingresar al menos un repuesto con descripción" },
          { status: 400 }
        );
      }

      updateData.itemsAEncargar = JSON.stringify(parsedItems);
      updateData.itemsProcesados = JSON.stringify(parsedItems);
      if (body.notasAdmin !== undefined) {
        updateData.notasAdmin = body.notasAdmin?.trim() || null;
      }
      updateData.adminId = session.id;
      updateData.fechaRevision = new Date();

      auditDetails.itemsAEncargarDefinitivos = parsedItems;
      auditDetails.descripcion = `Administrador ${session.nombre} editó la lista de repuestos del pedido #${id.slice(-4)}`;
    }

    // =========================================================================
    // ACCIÓN 3: CONFIRMAR LISTA A ENCARGAR (Admin -> "PARA_ENCARGAR")
    // Permisos: Solo Administrador
    // Requiere lista definitiva con al menos un ítem
    // =========================================================================
    else if (action === "CONFIRMAR_ENCARGO" || body.estado === "PARA_ENCARGAR") {
      if (role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo el Administrador puede definir y confirmar la lista a encargar" },
          { status: 403 }
        );
      }

      const itemsAEncargar = body.itemsAEncargar || body.itemsProcesados;
      let parsedItems: any[] = [];
      if (Array.isArray(itemsAEncargar)) {
        parsedItems = itemsAEncargar
          .filter((it: any) => it && (it.descripcion || it.nombre))
          .map((it: any, idx: number) => ({
            id: it.id || `item-encargar-${Date.now()}-${idx}`,
            descripcion: (it.descripcion || it.nombre || "").trim(),
            cantidad: Math.max(1, Number(it.cantidad) || 1),
          }));
      } else if (typeof itemsAEncargar === "string") {
        try {
          const arr = JSON.parse(itemsAEncargar);
          if (Array.isArray(arr)) {
            parsedItems = arr.map((it: any, idx: number) => ({
              id: it.id || `item-encargar-${Date.now()}-${idx}`,
              descripcion: (it.descripcion || it.nombre || "").trim(),
              cantidad: Math.max(1, Number(it.cantidad) || 1),
            }));
          }
        } catch {
          parsedItems = itemsAEncargar
            .split("\n")
            .map((l: string) => l.trim())
            .filter(Boolean)
            .map((l: string, idx: number) => ({
              id: `item-encargar-${Date.now()}-${idx}`,
              descripcion: l,
              cantidad: 1,
            }));
        }
      }

      if (parsedItems.length === 0) {
        return NextResponse.json(
          { error: "La lista definitiva a encargar debe tener al menos un ítem" },
          { status: 400 }
        );
      }

      updateData.estado = "PARA_ENCARGAR";
      updateData.adminId = session.id;
      updateData.fechaRevision = new Date();
      updateData.itemsAEncargar = JSON.stringify(parsedItems);
      updateData.itemsProcesados = JSON.stringify(parsedItems); // Retrocompatibilidad
      if (body.notasAdmin !== undefined) {
        updateData.notasAdmin = body.notasAdmin?.trim() || null;
      }

      auditDetails.estadoNuevo = "PARA_ENCARGAR";
      auditDetails.itemsSolicitadosOriginales = existingReq.itemsSolicitados;
      auditDetails.itemsAEncargarDefinitivos = parsedItems;
      auditDetails.descripcion = `Administrador ${session.nombre} confirmó la lista de ${parsedItems.length} repuestos para encargar`;
    }

    // =========================================================================
    // ACCIÓN 4: DEVOLVER AL MECÁNICO (Admin -> "DEVUELTO")
    // Permisos: Solo Administrador
    // Requiere motivo de devolución obligatorio
    // =========================================================================
    else if (action === "DEVOLVER" || body.estado === "DEVUELTO") {
      if (role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo el Administrador puede devolver un pedido al mecánico" },
          { status: 403 }
        );
      }

      const motivo = body.motivoDevolucion?.trim() || body.motivo?.trim();
      if (!motivo) {
        return NextResponse.json(
          { error: "Debe ingresar el motivo de la devolución para que el mecánico pueda corregir el pedido" },
          { status: 400 }
        );
      }

      updateData.estado = "DEVUELTO";
      updateData.adminId = session.id;
      updateData.fechaRevision = new Date();
      updateData.motivoDevolucion = motivo;

      auditDetails.estadoNuevo = "DEVUELTO";
      auditDetails.motivo = motivo;
      auditDetails.descripcion = `Administrador devolvió el pedido #${id.slice(-4)} al mecánico. Motivo: ${motivo}`;
    }

    // =========================================================================
    // ACCIÓN 5: REENVIAR PEDIDO CORREGIDO (Mecánico -> "SOLICITADO")
    // Permisos: Solo el Mecánico que creó el pedido
    // =========================================================================
    else if (action === "REENVIAR" || (existingReq.estado === "DEVUELTO" && body.estado === "SOLICITADO")) {
      if (role !== "MECHANIC" && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo el mecánico asignado puede reenviar un pedido corregido" },
          { status: 403 }
        );
      }

      if (body.fallaReparar) {
        updateData.fallaReparar = body.fallaReparar.trim();
      }
      if (body.observacionesMecanico !== undefined) {
        updateData.observacionesMecanico = body.observacionesMecanico?.trim() || null;
      }

      if (body.itemsSolicitados) {
        let parsedItems: any[] = [];
        if (Array.isArray(body.itemsSolicitados)) {
          parsedItems = body.itemsSolicitados.map((it: any, idx: number) => ({
            id: it.id || `item-${Date.now()}-${idx}`,
            descripcion: (it.descripcion || it.nombre || "").trim(),
            cantidad: Math.max(1, Number(it.cantidad) || 1),
          }));
        }
        if (parsedItems.length > 0) {
          updateData.itemsSolicitados = JSON.stringify(parsedItems);
          updateData.repuestosLista = parsedItems.map((it) => `• ${it.cantidad}x ${it.descripcion}`).join("\n");
        }
      }

      updateData.estado = "SOLICITADO";
      updateData.motivoDevolucion = null; // Limpiar motivo anterior

      auditDetails.estadoNuevo = "SOLICITADO";
      auditDetails.descripcion = `Mecánico ${session.nombre} corrigió y reenvió el pedido #${id.slice(-4)} para nueva revisión`;
    }

    // =========================================================================
    // ACCIÓN 6: ENCARGO REALIZADO (Recepción / Admin -> "ENCARGO_REALIZADO")
    // Proveedor y fecha estimada de llegada opcionales
    // =========================================================================
    else if (action === "ENCARGO_REALIZADO" || body.estado === "ENCARGO_REALIZADO") {
      if (role !== "RECEPTION" && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo Recepción o Administrador pueden marcar 'Encargo realizado'" },
          { status: 403 }
        );
      }

      updateData.estado = "ENCARGO_REALIZADO";
      updateData.encargadoPor = `${session.nombre} ${session.apellido || ""}`.trim();
      updateData.fechaEncargo = new Date();

      if (body.proveedor !== undefined) {
        updateData.proveedor = body.proveedor?.trim() || null;
      }
      if (body.fechaEstimadaLlegada !== undefined) {
        updateData.fechaEstimadaLlegada = body.fechaEstimadaLlegada
          ? new Date(body.fechaEstimadaLlegada)
          : null;
      }

      auditDetails.estadoNuevo = "ENCARGO_REALIZADO";
      auditDetails.proveedor = updateData.proveedor;
      auditDetails.fechaEstimadaLlegada = updateData.fechaEstimadaLlegada;
      auditDetails.descripcion = `Recepción marcó 'Encargo realizado' para el pedido #${id.slice(-4)}${updateData.proveedor ? ` (Proveedor: ${updateData.proveedor})` : ""}`;
    }

    // =========================================================================
    // ACCIÓN 7: RECIBIDO (Recepción / Admin -> "RECIBIDO")
    // =========================================================================
    else if (action === "RECIBIDO" || body.estado === "RECIBIDO") {
      if (role !== "RECEPTION" && role !== "ADMIN") {
        return NextResponse.json(
          { error: "Permiso denegado: solo Recepción o Administrador pueden marcar repuestos como 'Recibido'" },
          { status: 403 }
        );
      }

      updateData.estado = "RECIBIDO";
      updateData.recibidoPor = `${session.nombre} ${session.apellido || ""}`.trim();
      updateData.fechaRecepcion = new Date();

      if (body.remitoNro !== undefined) {
        updateData.remitoNro = body.remitoNro?.trim() || null;
      }
      if (body.notasRecepcion !== undefined) {
        updateData.notasRecepcion = body.notasRecepcion?.trim() || null;
      }

      auditDetails.estadoNuevo = "RECIBIDO";
      auditDetails.remitoNro = updateData.remitoNro;
      auditDetails.descripcion = `Recepción confirmó la llegada de los repuestos del pedido #${id.slice(-4)}. Se notifica al mecánico para que retome los trabajos.`;
    }

    // =========================================================================
    // ACTUALIZACIÓN DE FOTOS O CAMPOS GENERALES
    // =========================================================================
    if (body.fotos !== undefined) {
      updateData.fotos = typeof body.fotos === "string" ? body.fotos : JSON.stringify(body.fotos);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron cambios válidos para actualizar" },
        { status: 400 }
      );
    }

    const updated = await prisma.sparePartRequest.update({
      where: { id },
      data: updateData,
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

    // Registro inalterable en AuditLog
    await recordAuditLog({
      user: session,
      accion: `UPDATE_SPARE_PART_${updateData.estado || action || "REQUEST"}`,
      entidad: "SparePartRequest",
      entidadAfectada: "WorkOrders",
      entidadId: id,
      valores: auditDetails,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error al actualizar pedido de repuestos:", error);
    return NextResponse.json(
      { error: "Error al actualizar pedido: " + error.message },
      { status: 500 }
    );
  }
}
