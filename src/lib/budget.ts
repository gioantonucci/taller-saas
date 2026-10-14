import { prisma } from "@/lib/prisma";

export async function recalculateWorkOrderBudget(workOrderId: string) {
  // Obtener tenant settings para el valor de la hora de mano de obra
  const settings = await prisma.tenantSettings.findFirst();
  const valorHora = settings?.valorHoraManoDeObra || 15000;

  // Obtener workLogs de la orden
  const workLogs = await prisma.workLog.findMany({
    where: { workOrderId },
  });
  const totalHoras = workLogs.reduce((acc, log) => acc + log.horasInvertidas, 0);
  const costoManoDeObra = Math.round(totalHoras * valorHora);

  // Obtener repuestos de la orden
  const parts = await prisma.part.findMany({
    where: { workOrderId },
  });
  const subtotalRepuestos = parts.reduce((acc, p) => acc + p.precioVenta * p.cantidad, 0);

  const totalPresupuesto = costoManoDeObra + subtotalRepuestos;

  // Actualizar la orden en la base de datos
  const updatedOrder = await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      costoManoDeObra,
      totalPresupuesto,
    },
  });

  return {
    totalHoras,
    valorHora,
    costoManoDeObra,
    subtotalRepuestos,
    totalPresupuesto,
    updatedOrder,
  };
}
