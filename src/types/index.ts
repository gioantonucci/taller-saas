export type Role = "ADMIN" | "RECEPTION" | "MECHANIC" | "RECEPCION" | "MECANICO";

export interface TenantSettings {
  id: string;
  tallerNombre: string;
  whatsapp: string;
  logoUrl?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface UserSession {
  id: string;
  email: string;
  nombre: string;
  apellido?: string | null;
  role: Role;
  tenantId?: string | null;
}

export interface StorageUploadResult {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimeType: string;
  provider: "supabase" | "s3" | "local";
}

export interface DamagePin {
  id: string;
  x: number; // Porcentaje relativo X (0-100)
  y: number; // Porcentaje relativo Y (0-100)
  tipo: "RAYON" | "ABOLLADURA" | "ROTURA" | "PINTURA";
  severidad?: "LEVE" | "MODERADO" | "GRAVE";
  descripcion?: string;
  fecha?: string;
}

export interface DanioCarroceria {
  zona: string; // "Paragolpe Delantero", "Capot", "Lateral Izquierdo", "Lateral Derecho", "Techo", "Paragolpe Trasero", "Ópticas", "Parabrisas"
  tipo: "GOLPE_ABOLLADURA" | "RAYON_RASPON" | "ROTURA_FISURA" | "FALTANTE";
  descripcion: string;
}

export interface LucesTestigoTablero {
  checkEngine: boolean;
  abs: boolean;
  airbag: boolean;
  presionAceite: boolean;
  temperatura: boolean;
  bateria: boolean;
  frenoManoDesgaste: boolean;
  direccionAsistida: boolean;
  otrosTestigos?: string;
}

export interface PeritajeIngreso {
  fechaHoraPeritaje: string;
  peritadorId?: string;
  peritadorNombre?: string;
  nivelCombustible: string; // "VACIO", "1/4", "1/2", "3/4", "LLENO"
  kilometrajeTablero: number;
  damagePins?: DamagePin[];
  daniosCarroceria: DanioCarroceria[];
  lucesTestigo: LucesTestigoTablero;
  cristalesYOpticas: {
    parabrisasRajado: boolean;
    opticasDelanterasDanadas: boolean;
    farosTraserosRotos: boolean;
    espejosRetrovisoresRotos: boolean;
  };
  inventarioCabina: {
    ruedaAuxilio: boolean;
    criqueYHerramientas: boolean;
    tuercaSeguridad: boolean;
    documentacion: boolean;
    estereoFunciona: boolean;
    matafuegoVigente: boolean;
    tapaCombustible: boolean;
  };
  observacionesGenerales: string;
  comentariosDuenio?: string; // Declaración / Peritaje inicial del dueño indicando abolladuras y desperfectos
  fotosPeritajeUrls?: string[];
  cerrado?: boolean;
  estadoPeritaje?: "PENDIENTE" | "COMPLETADO" | "CERRADO";
  fechaCierre?: string;
  firmaCliente?: string | null; // Data URL PNG base64 de la firma capturada en tablet
  fechaFirmaCliente?: string | null;
  tuercaSeguridadUbicacion?: string; // Dónde está la tuerca de seguridad (ej. "Guantera", "Baúl")
  numeroBastidorVin?: string; // Número de bastidor (VIN)
  autorizaViaPublica?: boolean; // Autorización para ubicar en vía pública
}

export interface DamageChecklist {
  rayones: string[];
  ruedaAuxilio: boolean;
  criqueYHerramientas: boolean;
  documentacion: boolean;
  estereo: boolean;
  matafuego: boolean;
  lucesTestigo?: string[];
  observacionesAdicionales?: string;
}

export interface OCRPartItem {
  nombreRepuesto: string;
  codigo?: string;
  cantidad: number;
  costo: number;
  precioSugerido?: number;
}

export interface StaffMember {
  id: string;
  nombre: string;
  apellido?: string | null;
  email: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  creadoEn: string | Date;
  updatedAt?: string | Date;
  _count?: {
    workOrdersMechanic?: number;
  };
}

export interface SparePartItem {
  id: string;
  descripcion: string;
  cantidad: number;
  nombre?: string; // Retrocompatibilidad
  codigo?: string;
  proveedor?: string;
  notas?: string;
  costoEstimado?: number;
  recibido?: boolean;
  fechaRecibido?: string;
}

export interface SparePartPhoto {
  id: string;
  url: string;
  nota?: string;
  fecha: string;
}

export interface SparePartPostpone {
  usuario: string;
  fecha: string;
  tipo: "ENCARGO" | "LLEGADA";
}

export type SparePartStatus =
  | "SOLICITADO"
  | "EN_REVISION"
  | "PARA_ENCARGAR"
  | "DEVUELTO"
  | "ENCARGO_REALIZADO"
  | "RECIBIDO"
  | "CANCELADO"
  // Retrocompatibilidad
  | "PENDIENTE_ADMIN"
  | "PROCESADO_ADMIN"
  | "RECIBIDO_PARCIAL"
  | "RECIBIDO_TOTAL";

export interface SparePartRequest {
  id: string;
  workOrderId?: string | null;
  workOrder?: any;
  mechanicId?: string | null;
  mechanic?: {
    id: string;
    nombre: string;
    apellido?: string | null;
    email?: string;
  } | null;
  adminId?: string | null;
  admin?: {
    id: string;
    nombre: string;
    apellido?: string | null;
  } | null;

  // Datos cargados por el mecánico
  fallaReparar: string;
  repuestosLista: string;
  itemsSolicitados?: string | SparePartItem[] | null;
  observacionesMecanico?: string | null;
  fotoUrl?: string | null;
  fotos?: string | SparePartPhoto[] | null;

  // Estado del flujo
  estado: SparePartStatus;

  // Revisión Administrador
  fechaRevision?: string | null;
  motivoDevolucion?: string | null;
  itemsAEncargar?: string | SparePartItem[] | null;
  notasAdmin?: string | null;

  // Encargo
  encargadoPor?: string | null;
  fechaEncargo?: string | null;
  proveedor?: string | null;
  fechaEstimadaLlegada?: string | null;

  // Recepción de repuestos
  fechaRecepcion?: string | null;
  recibidoPor?: string | null;
  remitoNro?: string | null;
  notasRecepcion?: string | null;

  // Cancelación
  canceladoPor?: string | null;
  fechaCancelacion?: string | null;
  motivoCancelacion?: string | null;

  // Posposiciones
  posposiciones?: string | SparePartPostpone[] | null;

  // Retrocompatibilidad
  itemsProcesados?: string | null;
  fechaProcesado?: string | null;

  createdAt: string;
  updatedAt: string;
}


