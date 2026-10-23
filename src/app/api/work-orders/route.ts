import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { matchesSearchMulti } from "@/lib/search-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const search = searchParams.get("search");
    const mechanicId = searchParams.get("mechanicId");
    const scope = searchParams.get("scope");

    const where: any = {};

    if (estado && estado !== "TODOS") {
      if (estado === "PENDIENTE_PERITAJE" || estado === "PENDIENTE" || estado === "INGRESADO") {
        where.estado = { in: ["PENDIENTE_PERITAJE", "PENDIENTE", "INGRESADO"] };
      } else if (estado === "EN_REPARACION" || estado === "EN_CURSO" || estado === "PERITADO") {
        where.estado = { in: ["EN_REPARACION", "EN_CURSO", "PERITADO"] };
      } else if (estado === "EN_ESPERA_REPUESTOS" || estado === "ESPERANDO_REPUESTOS" || estado === "DETENIDO") {
        where.estado = { in: ["EN_ESPERA_REPUESTOS", "ESPERANDO_REPUESTOS", "DETENIDO"] };
      } else if (estado === "FINALIZADO" || estado === "REPARADO" || estado === "TERMINADO") {
        where.estado = { in: ["FINALIZADO", "REPARADO", "TERMINADO"] };
      } else if (estado === "ENTREGADO" || estado === "ARCHIVADO") {
        where.estado = { in: ["ENTREGADO", "ARCHIVADO"] };
      } else {
        where.estado = estado;
      }
    }

    // Filtrar por mecánico si se especifica en parámetros o scope específico de hoja de ruta
    const isAdminOrReception =
      session.role === "ADMIN" ||
      session.role === "RECEPTION" ||
      session.role === "RECEPCION";

    if (mechanicId && mechanicId !== "TODOS" && mechanicId !== "mine") {
      if (mechanicId === "UNASSIGNED") {
        where.mechanicId = null;
      } else {
        where.mechanicId = mechanicId;
      }
    } else if (scope === "mine" || mechanicId === "mine") {
      if (!isAdminOrReception) {
        where.mechanicId = session.id;
      }
    }

    if (scope === "mine" || mechanicId === "mine") {
      if (!estado || estado === "TODOS") {
        where.estado = { notIn: ["CANCELADO", "ENTREGADO", "ARCHIVADO"] };
        where.motivoCancelacion = null;
      }
    }

    const orders = await prisma.workOrder.findMany({
      where,
      include: {
        vehicle: {
          include: {
            client: true,
          },
        },
        mechanic: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        parts: true,
        workLogs: true,
        multimedia: true,
      },
      orderBy: [{ fechaCambioEstado: "desc" }, { updatedAt: "desc" }, { fechaIngreso: "desc" }],
    });

    const filteredOrders =
      search && search.trim()
        ? orders.filter((o) =>
            matchesSearchMulti(
              [
                o.vehicle?.patente,
                o.vehicle?.modelo,
                o.vehicle?.marca,
                o.vehicle?.client?.nombre,
                o.vehicle?.client?.apellido,
                o.vehicle?.client?.dni,
                o.numeroOrden,
                o.detallesIngreso,
              ],
              search
            )
          )
        : orders;

    return NextResponse.json({ success: true, orders: filteredOrders });
  } catch (error: any) {
    console.error("Error en GET /api/work-orders:", error);
    return NextResponse.json(
      { error: "Error al obtener las órdenes de trabajo" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      vehicleId,
      // Búsqueda o creación rápida de Cliente
      clienteId,
      clienteNombre,
      clienteApellido,
      clienteDni,
      clienteTelefono,
      clienteEmail,
      clienteDireccion,

      // Búsqueda o creación rápida de Vehículo
      vehiculoId,
      vehiculoPatente,
      vehiculoMarca,
      vehiculoModelo,
      vehiculoAnio,
      vehiculoColor,
      vehiculoChasis,
      vehiculoMotor,

      // Datos de la Orden de Trabajo
      mechanicId,
      detallesIngreso,
      comentariosDuenio,
      kilometraje,
      nivelNafta,
      checklistDanio,
      costoManoDeObra,
      firmaCliente,
    } = body;

    // 1. Resolver o Crear Vehículo y Cliente
    let resolvedVehicleId = vehicleId || vehiculoId;
    let resolvedClientId = clienteId;

    if (!resolvedVehicleId && vehiculoPatente) {
      const cleanPatente = vehiculoPatente.trim().toUpperCase();
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { patente: cleanPatente },
      });
      if (existingVehicle) {
        resolvedVehicleId = existingVehicle.id;
        if (!resolvedClientId) {
          resolvedClientId = existingVehicle.clientId;
        }
      }
    }

    if (resolvedVehicleId && !resolvedClientId) {
      const existingV = await prisma.vehicle.findUnique({
        where: { id: resolvedVehicleId },
        include: { client: true },
      });
      if (existingV) {
        resolvedClientId = existingV.clientId;
      }
    }

    if (!resolvedClientId && clienteDni) {
      const existingClient = await prisma.client.findUnique({
        where: { dni: clienteDni.trim() },
      });
      if (existingClient) {
        resolvedClientId = existingClient.id;
      } else {
        const newClient = await prisma.client.create({
          data: {
            nombre: clienteNombre || "Cliente",
            apellido: clienteApellido || "Nuevo",
            dni: clienteDni.trim(),
            telefono: clienteTelefono || "",
            email: clienteEmail || "",
            direccion: clienteDireccion ? clienteDireccion.trim() : "",
            isDeleted: false,
            status: "ACTIVE",
          },
        });
        resolvedClientId = newClient.id;

        await recordAuditLog({
          user: session,
          accion: "CREATE",
          entidad: "Clients",
          entidadAfectada: "Clients",
          entidadId: newClient.id,
          valores: { nombre: newClient.nombre, apellido: newClient.apellido, dni: newClient.dni },
          detallesCambio: {
            nuevo: { nombre: newClient.nombre, apellido: newClient.apellido, dni: newClient.dni },
          },
        });
      }
    }

    if (!resolvedClientId) {
      return NextResponse.json(
        { error: "Se requiere un vehículo existente o un cliente válido" },
        { status: 400 }
      );
    }

    // 2. Crear Vehículo si aún no existe en el sistema
    if (!resolvedVehicleId && vehiculoPatente) {
      const cleanPatente = vehiculoPatente.trim().toUpperCase();
      const newVehicle = await prisma.vehicle.create({
        data: {
          clientId: resolvedClientId,
          patente: cleanPatente,
          marca: vehiculoMarca || "Marca",
          modelo: vehiculoModelo || "Modelo",
          anio: parseInt(vehiculoAnio, 10) || new Date().getFullYear(),
          color: vehiculoColor || "Desconocido",
          nroChasis: vehiculoChasis || null,
          nroMotor: vehiculoMotor || null,
        },
      });
      resolvedVehicleId = newVehicle.id;

      await recordAuditLog({
        user: session,
        accion: "CREATE",
        entidadAfectada: "Vehicles",
        entidadId: newVehicle.id,
        detallesCambio: {
          nuevo: { patente: newVehicle.patente, marca: newVehicle.marca, modelo: newVehicle.modelo },
        },
      });
    }

    if (!resolvedVehicleId) {
      return NextResponse.json(
        { error: "Se requiere un vehículo existente o la patente para crearlo" },
        { status: 400 }
      );
    }

    if (resolvedVehicleId && vehiculoChasis) {
      await prisma.vehicle.update({
        where: { id: resolvedVehicleId },
        data: { nroChasis: vehiculoChasis.trim().toUpperCase() },
      }).catch(() => {});
    }

    if (resolvedClientId && clienteDireccion) {
      await prisma.client.update({
        where: { id: resolvedClientId },
        data: { direccion: clienteDireccion.trim() },
      }).catch(() => {});
    }

    // 3. REGLA DE NEGOCIO:
    // El mismo auto no puede estar dos veces en reparación ni en peritaje inicial simultáneamente.
    // Solo puede abrirse una nueva orden si todas sus órdenes previas están 'FINALIZADO', 'ENTREGADO', 'ARCHIVADO' o 'CANCELADO'.
    const activeOrderForVehicle = await prisma.workOrder.findFirst({
      where: {
        vehicleId: resolvedVehicleId,
        estado: {
          notIn: [
            "FINALIZADO",
            "REPARADO",
            "TERMINADO",
            "ENTREGADO",
            "ARCHIVADO",
            "CANCELADO",
            "CANCELADA",
            "DADA_DE_BAJA",
          ],
        },
        motivoCancelacion: null,
      },
      include: {
        vehicle: true,
      },
      orderBy: {
        numeroOrden: "desc",
      },
    });

    if (activeOrderForVehicle) {
      const vMarca = activeOrderForVehicle.vehicle.marca;
      const vModelo = activeOrderForVehicle.vehicle.modelo;
      const vPatente = activeOrderForVehicle.vehicle.patente;
      const estadoActual = activeOrderForVehicle.estado;
      return NextResponse.json(
        {
          error: `Operación denegada: El vehículo ${vMarca} ${vModelo} (${vPatente}) ya cuenta con la Orden activa #${activeOrderForVehicle.numeroOrden} en estado '${estadoActual}'. No puede ingresar dos veces al taller simultáneamente. Debe finalizarse o entregarse la orden previa antes de habilitar un nuevo ingreso.`,
          activeOrderId: activeOrderForVehicle.id,
          activeNumeroOrden: activeOrderForVehicle.numeroOrden,
          activeEstado: activeOrderForVehicle.estado,
        },
        { status: 400 }
      );
    }

    // 4. Obtener el siguiente número de orden secuencial
    const lastOrder = await prisma.workOrder.findFirst({
      orderBy: { numeroOrden: "desc" },
      select: { numeroOrden: true },
    });
    const nextNumeroOrden = (lastOrder?.numeroOrden || 1000) + 1;

    // 5. Determinar asignación de mecánico:
    // REGLA: Si la orden es recibida/creada por un mecánico, se autoasigna automáticamente a él.
    const isMechanic = session.role === "MECANICO" || session.role === "MECHANIC";
    const resolvedMechanicId = isMechanic ? session.id : (mechanicId || null);

    // 6. Procesar peritaje inicial y firma digital del cliente si existen
    let finalChecklistDanio: any = checklistDanio;
    if (finalChecklistDanio) {
      if (typeof finalChecklistDanio === "string") {
        try {
          finalChecklistDanio = JSON.parse(finalChecklistDanio);
        } catch {}
      }
      if (typeof finalChecklistDanio === "object" && firmaCliente && !finalChecklistDanio.firmaCliente) {
        finalChecklistDanio.firmaCliente = firmaCliente;
        finalChecklistDanio.fechaFirmaCliente = finalChecklistDanio.fechaFirmaCliente || new Date().toISOString();
      }
    } else if (firmaCliente) {
      finalChecklistDanio = {
        fechaHoraCheckin: new Date().toLocaleString("es-AR"),
        kilometrajeTablero: kilometraje ? parseInt(kilometraje, 10) : 0,
        nivelCombustible: nivelNafta || "1/2",
        comentariosDuenio: comentariosDuenio || "",
        damagePins: [],
        autorizaViaPublica: true,
        firmaCliente,
        fechaFirmaCliente: new Date().toISOString(),
        inventarioCabina: {
          ruedaAuxilio: true,
          criqueYHerramientas: true,
          tuercaSeguridad: false,
          documentacion: true,
          estereoFunciona: true,
          matafuegoVigente: true,
          tapaCombustible: true,
        },
      };
    }

    // 7. Crear la orden de trabajo
    const newWorkOrder = await prisma.workOrder.create({
      data: {
        numeroOrden: nextNumeroOrden,
        vehicleId: resolvedVehicleId,
        mechanicId: resolvedMechanicId,
        adminId: session.id,
        estado: "PENDIENTE_PERITAJE",
        fechaCambioEstado: new Date(),
        nivelNafta: nivelNafta || "1/2",
        kilometraje: kilometraje ? parseInt(kilometraje, 10) : null,
        detallesIngreso: detallesIngreso || "Ingreso para diagnóstico y peritaje",
        comentariosDuenio: comentariosDuenio || null,
        checklistDanio: finalChecklistDanio
          ? typeof finalChecklistDanio === "string"
            ? finalChecklistDanio
            : JSON.stringify(finalChecklistDanio)
          : null,
        costoManoDeObra: costoManoDeObra ? parseFloat(costoManoDeObra) : 0,
        totalPresupuesto: costoManoDeObra ? parseFloat(costoManoDeObra) : 0,
      },
      include: {
        vehicle: {
          include: { client: true },
        },
        mechanic: true,
      },
    });

    // 8. Registrar log de auditoría
    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidad: "WorkOrders",
      entidadAfectada: "WorkOrders",
      entidadId: newWorkOrder.id,
      valores: {
        numeroOrden: newWorkOrder.numeroOrden,
        vehicleId: newWorkOrder.vehicleId,
        patente: newWorkOrder.vehicle.patente,
        estado: newWorkOrder.estado,
        mechanicId: newWorkOrder.mechanicId,
        kilometraje: newWorkOrder.kilometraje,
        nivelNafta: newWorkOrder.nivelNafta,
        detallesIngreso: newWorkOrder.detallesIngreso,
      },
      detallesCambio: {
        nuevo: {
          numeroOrden: newWorkOrder.numeroOrden,
          patente: newWorkOrder.vehicle.patente,
          cliente: `${newWorkOrder.vehicle.client.nombre} ${newWorkOrder.vehicle.client.apellido}`,
          estado: newWorkOrder.estado,
          mecanicoAsignado: newWorkOrder.mechanic
            ? `${newWorkOrder.mechanic.nombre} ${newWorkOrder.mechanic.apellido || ""}`.trim()
            : "Sin asignar",
        },
        descripcion: `Apertura de Orden #${newWorkOrder.numeroOrden} (${newWorkOrder.vehicle.patente}) por ${session.nombre} (${session.role})${isMechanic ? " - Autoasignada al mecánico receptor" : ""}`,
      },
    });

    return NextResponse.json({
      success: true,
      order: newWorkOrder,
    });
  } catch (error: any) {
    console.error("Error en POST /api/work-orders:", error);
    return NextResponse.json(
      { error: "Error al crear la orden de trabajo" },
      { status: 500 }
    );
  }
}
