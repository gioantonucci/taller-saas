import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { recalculateWorkOrderBudget } from "@/lib/budget";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = params;

    // Verificar si la orden existe y si ya fue finalizada
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      select: { estado: true, checklistDanio: true },
    });

    if (!workOrder) {
      return NextResponse.json({ error: "Orden de trabajo no encontrada" }, { status: 404 });
    }

    if (
      workOrder.estado === "FINALIZADO" ||
      workOrder.estado === "REPARADO" ||
      workOrder.estado === "TERMINADO" ||
      workOrder.estado === "ENTREGADO" ||
      workOrder.estado === "ARCHIVADO"
    ) {
      return NextResponse.json(
        { error: "No se pueden sumar horas de trabajo porque la reparación ya se encuentra finalizada." },
        { status: 400 }
      );
    }

    // Regla de negocio estricta: Si no se realizó el peritaje no se pueden registrar tareas en reparación
    let hasPeritaje = false;
    if (workOrder.checklistDanio) {
      try {
        const p =
          typeof workOrder.checklistDanio === "string"
            ? JSON.parse(workOrder.checklistDanio)
            : workOrder.checklistDanio;
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
            "Operación denegada: No se pueden registrar tareas ni horas de trabajo sin haber completado previamente el peritaje técnico de ingreso del vehículo.",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { horasInvertidas, descripcionTarea, mechanicId } = body;

    const parsedHours = horasInvertidas !== undefined && horasInvertidas !== "" ? parseFloat(horasInvertidas) : 0;
    if (isNaN(parsedHours) || parsedHours < 0) {
      return NextResponse.json(
        { error: "La cantidad de horas debe ser un número válido (0 o superior)" },
        { status: 400 }
      );
    }

    if (!descripcionTarea || descripcionTarea.trim().length === 0) {
      return NextResponse.json(
        { error: "La descripción de la tarea realizada es obligatoria" },
        { status: 400 }
      );
    }

    const isMechanic = session.role === "MECANICO" || session.role === "MECHANIC";
    const effectiveMechanicId = isMechanic ? session.id : (mechanicId || session.id);

    const log = await prisma.workLog.create({
      data: {
        workOrderId: id,
        mechanicId: effectiveMechanicId,
        horasInvertidas: parsedHours,
        descripcionTarea: descripcionTarea.trim(),
      },
      include: {
        mechanic: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    // Auditoría
    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidadAfectada: "WorkLogs",
      entidadId: log.id,
      detallesCambio: {
        nuevo: {
          horas: parsedHours,
          tarea: descripcionTarea,
          ordenId: id,
        },
        descripcion: `Registro de ${parsedHours} hs de trabajo por ${log.mechanic.nombre} ${log.mechanic.apellido}`,
      },
    });

    // Recalcular presupuesto con el valor de la hora de taller y total de horas
    const budgetSummary = await recalculateWorkOrderBudget(id);

    if (isMechanic) {
      return NextResponse.json({ success: true, log });
    }

    return NextResponse.json({ success: true, log, ...budgetSummary });
  } catch (error: any) {
    console.error("Error en POST /api/work-orders/[id]/work-logs:", error);
    return NextResponse.json(
      { error: "Error al registrar las horas trabajadas" },
      { status: 500 }
    );
  }
}
