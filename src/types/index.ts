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
  clienteNotificadoWhatsApp?: boolean;
  cerrado?: boolean;
  estadoPeritaje?: "PENDIENTE" | "COMPLETADO" | "CERRADO";
  fechaCierre?: string;
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
