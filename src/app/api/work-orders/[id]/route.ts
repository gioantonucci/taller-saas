import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, normalizeRole } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { recalculateWorkOrderBudget } from "@/lib/budget";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    const order = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        vehicle: {
          include: {
            client: true,
          },
        },
        mechanic: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        admin: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        parts: {
          include: {
            inventoryItem: true,
          },
        },
        workLogs: {
          include: {
            mechanic: {
              select: { id: true, nombre: true, apellido: true },
            },
          },
          orderBy: { fechaRegistro: "desc" },
        },
        multimedia: {
          orderBy: { fechaCarga: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden de trabajo no encontrada" }, { status: 404 });
    }

    // Si es rol MECÁNICO, ocultar costos y precios financieros de acuerdo a las directivas del PRD:
    // "Restringido a datos técnicos (sin acceso a costos o datos de facturación)"
    if (session.role === "MECANICO" || session.role === "MECHANIC") {
      const sanitizedParts = order.parts.map((p) => ({
        id: p.id,
        nombreRepuesto: p.nombreRepuesto,
        codigo: p.codigo,
        cantidad: p.cantidad,
        createdAt: p.createdAt,
      }));

      const sanitizedOrder = {
        ...order,
        costoManoDeObra: 0,
        totalPresupuesto: 0,
        parts: sanitizedParts,
      };

      return NextResponse.json({ success: true, order: sanitizedOrder });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Error en GET /api/work-orders/[id]:", error);
    return NextResponse.json(
      { error: "Error al obtener la orden de trabajo" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    const currentOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        parts: true,
        vehicle: {
          include: { client: true },
        },
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    const updateData: any = {};
    const previousValues: any = {};
    const newValues: any = {};

    const isCurrentTerminado =
      currentOrder.estado === "FINALIZADO" ||
      currentOrder.estado === "TERMINADO" ||
      currentOrder.estado === "REPARADO";

    const isCurrentEntregado =
      currentOrder.estado === "ENTREGADO" ||
      currentOrder.estado === "ARCHIVADO" ||
      currentOrder.estado === "CANCELADO" ||
      currentOrder.estado === "CANCELADA" ||
      currentOrder.estado === "DADA_DE_BAJA";

    const isTargetCancelado =
      body.estado === "CANCELADO" ||
      body.estado === "CANCELADA" ||
      body.darDeBaja === true;

    if (isTargetCancelado) {
      if (isCurrentEntregado) {
        return NextResponse.json(
          {
            error:
              "La orden de trabajo ya se encuentra archivada o dada de baja. No se pueden modificar sus estados.",
          },
          { status: 400 }
        );
      }
      const motivo = (body.motivoCancelacion || "").trim();
      if (!motivo) {
        return NextResponse.json(
          {
            error:
              "Debe indicar el motivo por el cual se da de baja la orden de trabajo.",
          },
          { status: 400 }
        );
      }

      previousValues.estado = currentOrder.estado;
      newValues.estado = "CANCELADO";
      updateData.estado = "CANCELADO";
      updateData.motivoCancelacion = motivo;
      updateData.fechaCancelacion = new Date();

      // Guardar también dentro de checklistDanio para redundancia
      let existingChecklist: any = {};
      try {
        existingChecklist =
          typeof currentOrder.checklistDanio === "string"
            ? JSON.parse(currentOrder.checklistDanio)
            : currentOrder.checklistDanio || {};
      } catch {
        existingChecklist = {};
      }
      existingChecklist.motivoCancelacion = motivo;
      existingChecklist.fechaCancelacion = new Date().toISOString();
      existingChecklist.canceladoPor = `${session.nombre} ${session.apellido || ""}`.trim();
      updateData.checklistDanio = JSON.stringify(existingChecklist);
    } else if (body.estado !== undefined && body.estado !== currentOrder.estado) {
      const userRole = normalizeRole(session.role);
      const isTargetEntregado =
        body.estado === "ENTREGADO" || body.estado === "ARCHIVADO";

      // El personal de recepción puede marcar como entregado y archivar, pero no modificar etapas técnicas
      if (userRole === "RECEPTION" && !isTargetEntregado) {
        return NextResponse.json(
          {
            error:
              "Permiso denegado: El personal de recepción no puede modificar el estado operativo de la orden. El avance depende del peritaje técnico y el cierre técnico del mecánico.",
          },
          { status: 403 }
        );
      }

      // Si la orden ya fue entregada y archivada, queda sellada definitivamente
      if (isCurrentEntregado) {
        return NextResponse.json(
          {
            error:
              "La orden de trabajo ya se encuentra entregada y archivada. No se pueden modificar sus estados.",
          },
          { status: 400 }
        );
      }

      // Regla estricta 1: Si la reparación está terminada, solo puede transicionar a entregada/archivada
      if (isCurrentTerminado) {
        if (!isTargetEntregado) {
          if (
            body.estado === "PENDIENTE" ||
            body.estado === "PENDIENTE_PERITAJE" ||
            body.estado === "INGRESADO"
          ) {
            return NextResponse.json(
              {
                error:
                  "Transición no permitida: la reparación ya está terminada y cerrada. No se puede volver a peritaje.",
              },
              { status: 400 }
            );
          }
          return NextResponse.json(
            {
              error:
                "La orden de trabajo ya se encuentra finalizada técnicamente. Solo puede ser marcada como entregada para archivarla.",
            },
            { status: 400 }
          );
        }
      }

      // Para marcar como entregado y archivar, la orden debe haber concluido su reparación técnica
      if (isTargetEntregado && !isCurrentTerminado) {
        return NextResponse.json(
          {
            error:
              "Para marcar la orden como entregada y archivarla, la reparación técnica debe estar finalizada previamente.",
          },
          { status: 400 }
        );
      }

      // Regla de negocio estricta: No puede estar en reparación sin mecánico asignado
      const isTargetRepairOrDone =
        body.estado === "EN_CURSO" ||
        body.estado === "EN_REPARACION" ||
        body.estado === "ESPERANDO_REPUESTOS" ||
        body.estado === "EN_ESPERA_REPUESTOS" ||
        body.estado === "PERITADO" ||
        body.estado === "FINALIZADO" ||
        body.estado === "TERMINADO" ||
        body.estado === "REPARADO";

      const targetMechanicId =
        body.mechanicId !== undefined ? body.mechanicId : currentOrder.mechanicId;

      if (isTargetRepairOrDone && !targetMechanicId) {
        return NextResponse.json(
          {
            error:
              "Operación denegada: Un vehículo no puede estar en reparación sin un mecánico responsable asignado. Debe designar un mecánico antes de iniciar o continuar los trabajos técnicos.",
          },
          { status: 400 }
        );
      }

      // Regla de negocio estricta: Si no se realizó el peritaje no puede llegar al punto de reparación
      if (isTargetRepairOrDone) {
        let hasPeritaje = false;
        const rawChecklist =
          body.checklistDanio !== undefined ? body.checklistDanio : currentOrder.checklistDanio;
        if (rawChecklist) {
          try {
            const p = typeof rawChecklist === "string" ? JSON.parse(rawChecklist) : rawChecklist;
            hasPeritaje = Boolean(
              p &&
                (p.fechaHoraPeritaje ||
                  p.fechaHoraCheckin ||
                  p.estadoPeritaje === "COMPLETADO" ||
                  p.estadoPeritaje === "CERRADO" ||
                  p.cerrado === true ||
                  (Array.isArray(p.damagePins) && p.damagePins.length > 0) ||
                  (Array.isArray(p.daniosCarroceria) && p.daniosCarroceria.length > 0) ||
                  p.rayones)
            );
          } catch {
            hasPeritaje = false;
          }
        }

        if (!hasPeritaje) {
          return NextResponse.json(
            {
              error:
                "Operación denegada: No se puede avanzar al punto de reparación sin haber realizado previamente el peritaje técnico de ingreso.",
            },
            { status: 400 }
          );
        }
      }

      // Regla de negocio estricta 2: Si está en peritaje solo puede pasarse a reparación
      const isCurrentPeritaje =
        currentOrder.estado === "PENDIENTE" ||
        currentOrder.estado === "PENDIENTE_PERITAJE" ||
        currentOrder.estado === "INGRESADO";

      const isTargetPeritaje =
        body.estado === "PENDIENTE" ||
        body.estado === "PENDIENTE_PERITAJE" ||
        body.estado === "INGRESADO";

      if (isCurrentPeritaje) {
        const isTargetReparacion =
          body.estado === "EN_CURSO" ||
          body.estado === "EN_REPARACION" ||
          body.estado === "PERITADO";

        if (!isTargetReparacion) {
          return NextResponse.json(
            {
              error:
                "Transición de estado inválida: un vehículo en peritaje de ingreso solo puede avanzar a 'En Reparación'.",
            },
            { status: 400 }
          );
        }
      }

      // Regla de negocio estricta 3: No puede volverse al peritaje inicial una vez pasado a reparación
      if (!isCurrentPeritaje && isTargetPeritaje) {
        return NextResponse.json(
          {
            error:
              "Transición no permitida: el peritaje de ingreso ya fue completado y cerrado. No se puede volver al estado de peritaje inicial.",
          },
          { status: 400 }
        );
      }

      previousValues.estado = currentOrder.estado;
      newValues.estado = body.estado;
      updateData.estado = body.estado;

      if (isTargetEntregado) {
        updateData.fechaEntrega = new Date();
      } else if (body.estado === "FINALIZADO" || body.estado === "TERMINADO" || body.estado === "REPARADO") {
        const mechanicIdToUse = body.mechanicId !== undefined ? body.mechanicId : currentOrder.mechanicId;
        if (!mechanicIdToUse) {
          return NextResponse.json(
            {
              error:
                "No se puede finalizar la orden sin un mecánico responsable asignado. Debe designar un mecánico antes de concluir la reparación.",
            },
            { status: 400 }
          );
        }

        let hasPeritaje = false;
        const rawChecklist = body.checklistDanio !== undefined ? body.checklistDanio : currentOrder.checklistDanio;
        if (rawChecklist) {
          try {
            const p = typeof rawChecklist === "string" ? JSON.parse(rawChecklist) : rawChecklist;
            hasPeritaje = Boolean(
              p &&
                (p.fechaHoraPeritaje ||
                  p.fechaHoraCheckin ||
                  p.estadoPeritaje === "COMPLETADO" ||
                  (p.damagePins && p.damagePins.length > 0) ||
                  (p.daniosCarroceria && p.daniosCarroceria.length > 0) ||
                  p.rayones)
            );
          } catch {
            hasPeritaje = false;
          }
        }

        if (!hasPeritaje) {
          return NextResponse.json(
            {
              error:
                "No se puede finalizar la orden sin haber realizado el peritaje técnico de ingreso. Complete el peritaje antes del cierre técnico.",
            },
            { status: 400 }
          );
        }
      } else if (currentOrder.fechaEntrega) {
        updateData.fechaEntrega = null;
      }
    }

    if (body.mechanicId !== undefined && body.mechanicId !== currentOrder.mechanicId) {
      const userRole = normalizeRole(session.role);
      if (userRole === "MECHANIC") {
        return NextResponse.json(
          {
            error:
              "Permiso denegado: El mecánico no puede reasignar órdenes. Esta acción está reservada exclusivamente para Recepción y Administración.",
          },
          { status: 403 }
        );
      }

      if (isCurrentTerminado || isCurrentEntregado) {
        return NextResponse.json(
          {
            error:
              "La orden ya se encuentra finalizada y cerrada. No se puede modificar el mecánico asignado.",
          },
          { status: 400 }
        );
      }

      const effectiveEstado = body.estado || currentOrder.estado;
      const isOrderInRepair =
        effectiveEstado === "EN_CURSO" ||
        effectiveEstado === "EN_REPARACION" ||
        effectiveEstado === "ESPERANDO_REPUESTOS" ||
        effectiveEstado === "EN_ESPERA_REPUESTOS" ||
        effectiveEstado === "PERITADO" ||
        effectiveEstado === "FINALIZADO" ||
        effectiveEstado === "TERMINADO" ||
        effectiveEstado === "REPARADO";

      if (!body.mechanicId && isOrderInRepair) {
        return NextResponse.json(
          {
            error:
              "Operación denegada: Un vehículo no puede estar en reparación sin un mecánico responsable asignado. No se puede desasignar el mecánico mientras la orden se encuentre en reparación.",
          },
          { status: 400 }
        );
      }

      previousValues.mechanicId = currentOrder.mechanicId;
      newValues.mechanicId = body.mechanicId || null;
      updateData.mechanicId = body.mechanicId || null;

      let mechName = "Sin asignar";
      if (body.mechanicId) {
        const m = await prisma.user.findUnique({
          where: { id: body.mechanicId },
          select: { nombre: true, apellido: true },
        });
        if (m) {
          mechName = `${m.nombre} ${m.apellido || ""}`.trim();
        }
      }
      newValues.mecanicoAsignado = mechName;

      await recordAuditLog({
        user: session,
        accion: "ASIGNACION_MECANICO",
        entidadAfectada: "WorkOrders",
        entidadId: id,
        detallesCambio: {
          ordenId: id,
          numeroOrden: currentOrder.numeroOrden,
          patente: currentOrder.vehicle?.patente,
          mecanicoId: body.mechanicId,
          mecanicoNombre: mechName,
          descripcion: `Orden #${currentOrder.numeroOrden} asignada a mecánico: ${mechName}`,
        },
      });
    }

    if (body.avisoCliente) {
      await recordAuditLog({
        user: session,
        accion: "AVISO_CLIENTE",
        entidadAfectada: "WorkOrders",
        entidadId: id,
        detallesCambio: {
          ordenId: id,
          numeroOrden: currentOrder.numeroOrden,
          patente: currentOrder.vehicle?.patente,
          canal: body.canal || "WhatsApp",
          cliente: `${currentOrder.vehicle?.client?.nombre || ""} ${currentOrder.vehicle?.client?.apellido || ""}`.trim(),
          descripcion: `Aviso de finalización enviado al cliente (${currentOrder.vehicle?.client?.nombre || ""} ${currentOrder.vehicle?.client?.apellido || ""}) para Orden #${currentOrder.numeroOrden}`,
        },
      });
    }

    if (body.checklistDanio !== undefined || body.isPeritajeProfundo) {
      const userRole = normalizeRole(session.role);
      if (userRole === "RECEPTION") {
        return NextResponse.json(
          {
            error:
              "Permiso denegado: El personal de recepción no puede realizar ni guardar el peritaje técnico. Esta acción solo puede ser ejecutada por mecánicos o administradores.",
          },
          { status: 403 }
        );
      }
    }

    if (body.isPeritajeProfundo) {
      await recordAuditLog({
        user: session,
        accion: "PERITAJE_PROFUNDO",
        entidadAfectada: "WorkOrders",
        entidadId: id,
        detallesCambio: {
          ordenId: id,
          numeroOrden: currentOrder.numeroOrden,
          patente: currentOrder.vehicle?.patente,
          mecanico: `${session.nombre} ${session.apellido || ""}`.trim(),
          descripcion: `Peritaje profundo completado por mecánico para Orden #${currentOrder.numeroOrden}`,
        },
      });
    }

    // REGLA DE NEGOCIO ESTRICTA: El peritaje de ingreso es un acta legal inmutable una vez cerrado
    let isCurrentPeritajeCerrado = false;
    if (currentOrder.checklistDanio) {
      try {
        const parsed =
          typeof currentOrder.checklistDanio === "string"
            ? JSON.parse(currentOrder.checklistDanio)
            : currentOrder.checklistDanio;
        if (
          parsed &&
          (parsed.cerrado === true ||
            parsed.estadoPeritaje === "COMPLETADO" ||
            parsed.estadoPeritaje === "CERRADO" ||
            Boolean(parsed.fechaCierre) ||
            Boolean(parsed.fechaHoraPeritaje))
        ) {
          isCurrentPeritajeCerrado = true;
        }
      } catch {}
    }

    if (
      currentOrder.estado !== "PENDIENTE" &&
      currentOrder.estado !== "PENDIENTE_PERITAJE" &&
      currentOrder.estado !== "INGRESADO"
    ) {
      if (currentOrder.checklistDanio) {
        isCurrentPeritajeCerrado = true;
      }
    }

    if (isCurrentPeritajeCerrado) {
      if (body.checklistDanio !== undefined) {
        const checklistStr =
          typeof body.checklistDanio === "string"
            ? body.checklistDanio
            : JSON.stringify(body.checklistDanio);
        if (checklistStr !== currentOrder.checklistDanio) {
          return NextResponse.json(
            {
              error:
                "Operación denegada: El peritaje técnico de ingreso ya se encuentra cerrado e inmutable. Por normativa legal y de auditoría, los datos del peritaje no pueden ser modificados una vez cerrado.",
            },
            { status: 400 }
          );
        }
      }

      if (body.nivelNafta !== undefined && body.nivelNafta !== currentOrder.nivelNafta) {
        return NextResponse.json(
          {
            error:
              "Operación denegada: El nivel de combustible quedó sellado en el peritaje de ingreso cerrado y no puede ser alterado.",
          },
          { status: 400 }
        );
      }

      if (
        body.kilometraje !== undefined &&
        Number(body.kilometraje) !== Number(currentOrder.kilometraje)
      ) {
        return NextResponse.json(
          {
            error:
              "Operación denegada: El kilometraje en odómetro quedó sellado en el peritaje de ingreso cerrado y no puede ser alterado.",
          },
          { status: 400 }
        );
      }

      if (
        body.comentariosDuenio !== undefined &&
        body.comentariosDuenio !== currentOrder.comentariosDuenio
      ) {
        return NextResponse.json(
          {
            error:
              "Operación denegada: La declaración inicial de daños del dueño quedó asentada en el peritaje cerrado y no puede ser modificada.",
          },
          { status: 400 }
        );
      }
    } else if (body.checklistDanio !== undefined) {
      // Cierre formal del peritaje en su primer asentamiento
      let parsedChecklist: any = null;
      try {
        parsedChecklist =
          typeof body.checklistDanio === "string"
            ? JSON.parse(body.checklistDanio)
            : { ...body.checklistDanio };
      } catch {
        parsedChecklist = {};
      }

      if (parsedChecklist && typeof parsedChecklist === "object") {
        parsedChecklist.cerrado = true;
        parsedChecklist.estadoPeritaje = "COMPLETADO";
        if (!parsedChecklist.fechaCierre) {
          parsedChecklist.fechaCierre = new Date().toISOString();
        }
        if (!parsedChecklist.fechaHoraPeritaje) {
          parsedChecklist.fechaHoraPeritaje = new Date().toLocaleString("es-AR");
        }
        body.checklistDanio = JSON.stringify(parsedChecklist);
      }
    }

    if (body.nivelNafta !== undefined && body.nivelNafta !== currentOrder.nivelNafta) {
      previousValues.nivelNafta = currentOrder.nivelNafta;
      newValues.nivelNafta = body.nivelNafta;
      updateData.nivelNafta = body.nivelNafta;
    }

    if (body.kilometraje !== undefined) {
      const parsedKm = parseInt(String(body.kilometraje), 10);
      if (!isNaN(parsedKm) && parsedKm !== currentOrder.kilometraje) {
        previousValues.kilometraje = currentOrder.kilometraje;
        newValues.kilometraje = parsedKm;
        updateData.kilometraje = parsedKm;
      }
    }

    if (body.detallesIngreso !== undefined && body.detallesIngreso !== currentOrder.detallesIngreso) {
      previousValues.detallesIngreso = currentOrder.detallesIngreso;
      newValues.detallesIngreso = body.detallesIngreso;
      updateData.detallesIngreso = body.detallesIngreso;
    }

    if (body.comentariosDuenio !== undefined && body.comentariosDuenio !== currentOrder.comentariosDuenio) {
      previousValues.comentariosDuenio = currentOrder.comentariosDuenio;
      newValues.comentariosDuenio = body.comentariosDuenio;
      updateData.comentariosDuenio = body.comentariosDuenio;
    }

    if (body.checklistDanio !== undefined) {
      const checklistStr = typeof body.checklistDanio === "string" ? body.checklistDanio : JSON.stringify(body.checklistDanio);
      if (checklistStr !== currentOrder.checklistDanio) {
        previousValues.checklistDanio = currentOrder.checklistDanio;
        newValues.checklistDanio = checklistStr;
        updateData.checklistDanio = checklistStr;
      }
    }

    // Encuesta de control de calidad y recordatorios de salida completada por el mecánico
    if (body.controlCalidadSalida !== undefined) {
      let parsedChecklist: any = {};
      try {
        const base = updateData.checklistDanio || currentOrder.checklistDanio;
        parsedChecklist = base
          ? (typeof base === "string" ? JSON.parse(base) : base)
          : {};
      } catch {
        parsedChecklist = {};
      }

      parsedChecklist.controlCalidadSalida = {
        realizoResetServicio: Boolean(body.controlCalidadSalida.realizoResetServicio),
        condujoCarretera: Boolean(body.controlCalidadSalida.condujoCarretera),
        desperfectoSolucionado: Boolean(body.controlCalidadSalida.desperfectoSolucionado),
        desperfectoNuevoDetectado: Boolean(body.controlCalidadSalida.desperfectoNuevoDetectado),
        detalleNuevoDesperfecto: body.controlCalidadSalida.detalleNuevoDesperfecto
          ? String(body.controlCalidadSalida.detalleNuevoDesperfecto).trim()
          : "",
        fechaEncuesta: body.controlCalidadSalida.fechaEncuesta || new Date().toISOString(),
        mecanicoId: session.id,
        mecanicoNombre: `${session.nombre} ${session.apellido || ""}`.trim(),
      };

      const checklistStr = JSON.stringify(parsedChecklist);
      previousValues.checklistDanio = currentOrder.checklistDanio;
      newValues.checklistDanio = checklistStr;
      updateData.checklistDanio = checklistStr;

      await recordAuditLog({
        user: session,
        accion: "UPDATE",
        entidadAfectada: "WorkOrder",
        entidadId: id,
        detallesCambio: {
          controlCalidadSalida: parsedChecklist.controlCalidadSalida,
          descripcion: `Cierre de reparación y checklist de salida completado por mecánico ${session.nombre} ${session.apellido || ""}.`,
        },
      });
    }

    // Actualizaciones financieras (solo ADMIN o RECEPCION)
    if (session.role !== "MECANICO" && session.role !== "MECHANIC") {
      if (body.costoManoDeObra !== undefined) {
        const manoObra = parseFloat(body.costoManoDeObra) || 0;
        previousValues.costoManoDeObra = currentOrder.costoManoDeObra;
        newValues.costoManoDeObra = manoObra;
        updateData.costoManoDeObra = manoObra;

        // Recalcular total presupuesto
        const totalParts = currentOrder.parts.reduce((sum, p) => sum + p.precioVenta * p.cantidad, 0);
        updateData.totalPresupuesto = manoObra + totalParts;
      }
    }

    // Registro de nota de cierre y horas trabajadas si se enviaron al finalizar la reparación
    const finalHours =
      body.finalWorkLog?.horasInvertidas !== undefined
        ? parseFloat(body.finalWorkLog.horasInvertidas)
        : body.horasTrabajadas !== undefined
        ? parseFloat(body.horasTrabajadas)
        : null;

    const finalNote =
      body.finalWorkLog?.descripcionTarea !== undefined
        ? body.finalWorkLog.descripcionTarea
        : body.notaCierre !== undefined
        ? body.notaCierre
        : null;

    if (finalHours !== null || finalNote !== null) {
      const parsedHours =
        finalHours !== null && !isNaN(finalHours) ? Math.max(0, finalHours) : 0;
      const noteStr =
        finalNote && typeof finalNote === "string" ? finalNote.trim() : "";

      if (parsedHours > 0 || noteStr.length > 0) {
        const effectiveMechanicId =
          (session.role === "MECANICO" || session.role === "MECHANIC")
            ? session.id
            : body.finalWorkLog?.mechanicId ||
              currentOrder.mechanicId ||
              session.id;

        const newLog = await prisma.workLog.create({
          data: {
            workOrderId: id,
            mechanicId: effectiveMechanicId,
            horasInvertidas: parsedHours,
            descripcionTarea:
              noteStr || "Finalización de reparación y cierre de orden.",
          },
          include: {
            mechanic: { select: { id: true, nombre: true, apellido: true } },
          },
        });

        await recordAuditLog({
          user: session,
          accion: "CREATE",
          entidadAfectada: "WorkLogs",
          entidadId: newLog.id,
          detallesCambio: {
            nuevo: {
              horas: parsedHours,
              tarea: noteStr,
              ordenId: id,
            },
            descripcion: `Cierre de reparación: ${parsedHours} hs trabajadas (${
              noteStr || "Sin nota adicional"
            })`,
          },
        });

        await recalculateWorkOrderBudget(id);
      }
    }

    const updatedOrder = await prisma.workOrder.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: {
          include: { client: true },
        },
        mechanic: true,
        parts: true,
        workLogs: {
          include: {
            mechanic: {
              select: { id: true, nombre: true, apellido: true },
            },
          },
          orderBy: { fechaRegistro: "desc" },
        },
        multimedia: true,
      },
    });

    // Registro de Auditoría específico para transiciones de estado
    if (newValues.estado && newValues.estado !== previousValues.estado) {
      let statusAction = "STATUS_CHANGE";
      if (newValues.estado === "FINALIZADO" || newValues.estado === "TERMINADO" || newValues.estado === "REPARADO") {
        statusAction = "FINALIZACION_REPARACION";
      } else if (newValues.estado === "ENTREGADO" || newValues.estado === "ARCHIVADO") {
        statusAction = "ENTREGA_VEHICULO";
      } else if (newValues.estado === "CANCELADO") {
        statusAction = "DAR_DE_BAJA";
      }

      await recordAuditLog({
        user: session,
        accion: statusAction,
        entidad: "WorkOrders",
        entidadAfectada: "WorkOrders",
        entidadId: id,
        detallesCambio: {
          anterior: previousValues.estado,
          nuevo: newValues.estado,
          ordenId: id,
          numeroOrden: currentOrder.numeroOrden,
          patente: currentOrder.vehicle?.patente,
          descripcion: `Cambio de estado en Orden #${currentOrder.numeroOrden} (${currentOrder.vehicle.patente}): de '${previousValues.estado}' a '${newValues.estado}'`,
        },
      });
    }

    // Registrar en AuditLog con detalle JSON de otros valores actualizados
    const otherKeys = Object.keys(newValues).filter((k) => k !== "estado");
    if (otherKeys.length > 0 || (Object.keys(newValues).length > 0 && !newValues.estado)) {
      await recordAuditLog({
        user: session,
        accion: "UPDATE",
        entidad: "WorkOrders",
        entidadAfectada: "WorkOrders",
        entidadId: id,
        detallesCambio: {
          anterior: previousValues,
          nuevo: newValues,
          ordenId: id,
          numeroOrden: currentOrder.numeroOrden,
          patente: currentOrder.vehicle?.patente,
          descripcion: `Actualización de campos en Orden #${currentOrder.numeroOrden} (${currentOrder.vehicle?.patente}): ${otherKeys.join(", ") || "general"}`,
        },
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    console.error("Error en PATCH /api/work-orders/[id]:", error);
    return NextResponse.json(
      { error: "Error al actualizar la orden de trabajo" },
      { status: 500 }
    );
  }
}
