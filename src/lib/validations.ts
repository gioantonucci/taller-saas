import { z } from "zod";

// ==============================================================================
// ESQUEMAS DE VALIDACIÓN ZOD - MÓDULO DE RECEPCIÓN (FASE 3)
// ==============================================================================

export const clientFormSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Nombre demasiado largo"),
  apellido: z
    .string()
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(100, "Apellido demasiado largo"),
  dni: z
    .string()
    .min(6, "El DNI/CUIT debe tener al menos 6 caracteres")
    .max(20, "DNI/CUIT demasiado largo")
    .regex(/^[0-9A-Za-z.\-_ ]+$/, "Formato de documento inválido"),
  telefono: z
    .string()
    .min(6, "El teléfono debe tener al menos 6 dígitos")
    .max(50, "Teléfono demasiado largo"),
  email: z
    .string()
    .email("Ingrese un correo electrónico válido")
    .or(z.literal(""))
    .optional(),
  direccion: z
    .string()
    .max(255, "Dirección demasiado larga")
    .optional()
    .or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const vehicleFormSchema = z.object({
  clientId: z.string().min(1, "Debe seleccionar o asignar un cliente"),
  marca: z
    .string()
    .min(2, "La marca debe tener al menos 2 caracteres")
    .max(100, "Marca demasiado larga"),
  modelo: z
    .string()
    .min(1, "El modelo es obligatorio")
    .max(100, "Modelo demasiado largo"),
  anio: z
    .number({ message: "El año debe ser un número válido" })
    .min(1950, "El año no puede ser menor a 1950")
    .max(new Date().getFullYear() + 1, "El año no puede ser a futuro"),
  patente: z
    .string()
    .min(6, "La patente debe tener al menos 6 caracteres")
    .max(15, "Patente demasiado larga"),
  nroChasis: z.string().max(50, "Chasis demasiado largo").optional().or(z.literal("")),
  nroMotor: z.string().max(50, "Número de motor demasiado largo").optional().or(z.literal("")),
  color: z.string().max(50, "Color demasiado largo").optional().or(z.literal("")),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export const quickVehicleAndClientSchema = z.object({
  // Datos del Vehículo
  marca: z.string().min(2, "La marca es requerida"),
  modelo: z.string().min(1, "El modelo es requerido"),
  anio: z
    .number({ message: "El año debe ser un número válido" })
    .min(1950, "El año no puede ser menor a 1950")
    .max(new Date().getFullYear() + 1, "El año no puede ser a futuro"),
  patente: z.string().min(6, "La patente es requerida").max(15, "Patente demasiado larga"),
  nroChasis: z.string().optional().or(z.literal("")),
  nroMotor: z.string().optional().or(z.literal("")),
  color: z.string().optional().or(z.literal("")),

  // Selección o Creación de Cliente
  modoCliente: z.enum(["EXISTENTE", "NUEVO"] as const),
  clientId: z.string().optional().or(z.literal("")),
  clienteNombre: z.string().optional().or(z.literal("")),
  clienteApellido: z.string().optional().or(z.literal("")),
  clienteDni: z.string().optional().or(z.literal("")),
  clienteTelefono: z.string().optional().or(z.literal("")),
  clienteEmail: z.string().optional().or(z.literal("")),
}).refine(
  (data) => {
    if (data.modoCliente === "EXISTENTE") {
      return Boolean(data.clientId && data.clientId.length > 0);
    }
    return Boolean(
      data.clienteNombre &&
      data.clienteNombre.length >= 2 &&
      data.clienteApellido &&
      data.clienteApellido.length >= 2 &&
      data.clienteDni &&
      data.clienteDni.length >= 6
    );
  },
  {
    message: "Debe seleccionar un cliente existente o completar Nombre, Apellido y DNI para el cliente nuevo",
    path: ["clientId"],
  }
);

export type QuickVehicleAndClientValues = z.infer<typeof quickVehicleAndClientSchema>;

export const openWorkOrderSchema = z.object({
  vehicleId: z.string().min(1, "Vehículo requerido"),
  nivelNafta: z.enum(["VACIO", "1/4", "1/2", "3/4", "LLENO"] as const, {
    message: "Seleccione el nivel de combustible",
  }),
  kilometraje: z
    .number({ message: "El kilometraje debe ser numérico" })
    .min(0, "El kilometraje no puede ser negativo"),
  detallesIngreso: z
    .string()
    .min(5, "Describa el motivo del ingreso o la falla (mínimo 5 caracteres)")
    .max(1000, "Descripción demasiado larga"),
  comentariosDuenio: z.string().optional(),
});

export type OpenWorkOrderValues = z.infer<typeof openWorkOrderSchema>;
