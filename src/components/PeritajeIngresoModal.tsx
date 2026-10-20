"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileCheck,
  AlertTriangle,
  Camera,
  Car,
  Fuel,
  CheckCircle2,
  X,
  ShieldAlert,
  Gauge,
  Lock,
  Check,
  UserCheck,
  Wrench,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  Upload,
  Video,
  Play,
  Info,
} from "lucide-react";
import { PeritajeIngreso, DanioCarroceria, LucesTestigoTablero, DamagePin } from "@/types";
import { compressImageClient } from "@/lib/client-compress";
import CarDamageBlueprint from "@/components/CarDamageBlueprint";
import InAppCameraModal from "@/components/InAppCameraModal";
import { useAppDialog } from "@/components/AppDialog";

interface PeritajeModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  isMechanic?: boolean;
  readOnly?: boolean;
}

export default function PeritajeIngresoModal({
  order,
  isOpen,
  onClose,
  onSaved,
  isMechanic = false,
  readOnly = false,
}: PeritajeModalProps) {
  const { confirm, alert } = useAppDialog();

  // Inicializar estado del peritaje a partir de la orden existente si existe
  const initialPeritaje: PeritajeIngreso = (() => {
    const defaultData: PeritajeIngreso = {
      fechaHoraPeritaje: new Date().toLocaleString("es-AR"),
      peritadorNombre: order?.mechanic ? `${order.mechanic.nombre} ${order.mechanic.apellido || ""}` : "Mecánico de Turno",
      nivelCombustible: order?.nivelNafta || "1/2",
      kilometrajeTablero: order?.kilometraje || 0,
      damagePins: [],
      daniosCarroceria: [],
      lucesTestigo: {
        checkEngine: false,
        abs: false,
        airbag: false,
        presionAceite: false,
        temperatura: false,
        bateria: false,
        frenoManoDesgaste: false,
        direccionAsistida: false,
        otrosTestigos: "",
      },
      cristalesYOpticas: {
        parabrisasRajado: false,
        opticasDelanterasDanadas: false,
        farosTraserosRotos: false,
        espejosRetrovisoresRotos: false,
      },
      inventarioCabina: {
        ruedaAuxilio: true,
        criqueYHerramientas: true,
        tuercaSeguridad: false,
        documentacion: true,
        estereoFunciona: true,
        matafuegoVigente: true,
        tapaCombustible: true,
      },
      observacionesGenerales: "",
      comentariosDuenio: order?.comentariosDuenio || "",
    };

    if (order?.checklistDanio) {
      try {
        const parsed =
          typeof order.checklistDanio === "string"
            ? JSON.parse(order.checklistDanio)
            : order.checklistDanio;
        if (parsed && typeof parsed === "object") {
          const rawObs = parsed.observacionesGenerales?.trim() || "";
          const isCopiedFromReception =
            Boolean(rawObs && order?.detallesIngreso && rawObs === order.detallesIngreso.trim());

          return {
            ...defaultData,
            ...parsed,
            damagePins: Array.isArray(parsed.damagePins) ? parsed.damagePins : defaultData.damagePins,
            daniosCarroceria: Array.isArray(parsed.daniosCarroceria) ? parsed.daniosCarroceria : defaultData.daniosCarroceria,
            lucesTestigo: {
              ...defaultData.lucesTestigo,
              ...(parsed.lucesTestigo || {}),
            },
            cristalesYOpticas: {
              ...defaultData.cristalesYOpticas,
              ...(parsed.cristalesYOpticas || {}),
            },
            inventarioCabina: {
              ...defaultData.inventarioCabina,
              ...(parsed.inventarioCabina || {}),
            },
            nivelCombustible: parsed.nivelCombustible || order.nivelNafta || defaultData.nivelCombustible,
            kilometrajeTablero: parsed.kilometrajeTablero || order.kilometraje || defaultData.kilometrajeTablero,
            observacionesGenerales: isCopiedFromReception ? "" : rawObs,
            comentariosDuenio: parsed.comentariosDuenio || defaultData.comentariosDuenio,
          } as PeritajeIngreso;
        }
      } catch {}
    }

    return defaultData;
  })();

  const [peritaje, setPeritaje] = useState<PeritajeIngreso>(initialPeritaje);

  useEffect(() => {
    if (order?.checklistDanio) {
      try {
        const parsed =
          typeof order.checklistDanio === "string"
            ? JSON.parse(order.checklistDanio)
            : order.checklistDanio;
        if (parsed && typeof parsed === "object") {
          setPeritaje((prev) => ({
            ...prev,
            ...parsed,
            damagePins: Array.isArray(parsed.damagePins) ? parsed.damagePins : prev.damagePins || [],
            daniosCarroceria: Array.isArray(parsed.daniosCarroceria) ? parsed.daniosCarroceria : prev.daniosCarroceria || [],
            lucesTestigo: {
              ...prev.lucesTestigo,
              ...(parsed.lucesTestigo || {}),
            },
            cristalesYOpticas: {
              ...prev.cristalesYOpticas,
              ...(parsed.cristalesYOpticas || {}),
            },
            inventarioCabina: {
              ...prev.inventarioCabina,
              ...(parsed.inventarioCabina || {}),
            },
            nivelCombustible: parsed.nivelCombustible || order.nivelNafta || prev.nivelCombustible,
            kilometrajeTablero: parsed.kilometrajeTablero || order.kilometraje || prev.kilometrajeTablero,
            observacionesGenerales:
              parsed.observacionesGenerales &&
              parsed.observacionesGenerales.trim() !== (order?.detallesIngreso || "").trim()
                ? parsed.observacionesGenerales
                : prev.observacionesGenerales &&
                  prev.observacionesGenerales.trim() !== (order?.detallesIngreso || "").trim()
                ? prev.observacionesGenerales
                : "",
            comentariosDuenio: parsed.comentariosDuenio || prev.comentariosDuenio,
          }));
        }
      } catch {}
    }
  }, [order?.checklistDanio, order?.id]);

  const [activeTab, setActiveTab] = useState<"TABLERO" | "CARROCERIA" | "INVENTARIO" | "FOTOS">("TABLERO");
  const TABS: Array<"TABLERO" | "CARROCERIA" | "INVENTARIO" | "FOTOS"> = [
    "TABLERO",
    "CARROCERIA",
    "INVENTARIO",
    "FOTOS",
  ];
  const currentTabIndex = TABS.indexOf(activeTab);
  const handlePrevTab = () => {
    if (currentTabIndex > 0) {
      setActiveTab(TABS[currentTabIndex - 1]);
    }
  };
  const handleNextTab = () => {
    if (currentTabIndex < TABS.length - 1) {
      setActiveTab(TABS[currentTabIndex + 1]);
    }
  };
  const [saving, setSaving] = useState(false);
  const [mechanicsList, setMechanicsList] = useState<any[]>([]);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>(order?.mechanicId || "");

  useEffect(() => {
    if (isOpen) {
      setSelectedMechanicId(order?.mechanicId || "");
      fetch("/api/mechanics")
        .then((res) => res.json())
        .then((data) => {
          if (data.mechanics) {
            setMechanicsList(data.mechanics);
            if (!order?.mechanicId && data.mechanics.length > 0) {
              setSelectedMechanicId(data.mechanics[0].id);
            }
          }
        })
        .catch((err) => console.error("Error cargando mecánicos:", err));
    }
  }, [isOpen, order?.mechanicId]);

  // Cámara, galería y compresión
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraInitialMode, setCameraInitialMode] = useState<"FOTO" | "VIDEO">("FOTO");
  const MAX_PAYLOAD_SIZE = 4.5 * 1024 * 1024; // 4.5 MB límite estricto de Serverless en Vercel
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);
  const fileInputVideoCameraRef = useRef<HTMLInputElement | null>(null);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<
    "granted" | "prompt" | "denied" | "unknown"
  >("unknown");
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "camera" as any })
        .then((perm) => {
          setCameraPermissionStatus(perm.state as any);
          perm.onchange = () => {
            setCameraPermissionStatus(perm.state as any);
          };
        })
        .catch(() => {
          setCameraPermissionStatus("unknown");
        });
    }
  }, []);

  const requestCameraAccess = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    setIsRequestingPermission(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraPermissionStatus("granted");
      return true;
    } catch (err: any) {
      console.warn("Permiso de cámara denegado:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setCameraPermissionStatus("denied");
      }
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleNativeCameraClick = async (e: React.MouseEvent<HTMLLabelElement>) => {
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;

    if (isIOS) {
      return;
    }

    if (cameraPermissionStatus !== "granted") {
      e.preventDefault();
      const granted = await requestCameraAccess();
      if (granted) {
        setTimeout(() => {
          fileInputCameraRef.current?.click();
        }, 150);
      } else {
        await alert({
          title: "Acceso a Cámara Necesario",
          message: "Para abrir la cámara nativa, debes permitir el acceso a la cámara en el navegador. Si fue bloqueado, habilítalo en la configuración de permisos del sitio.",
          variant: "warning",
          icon: "warning",
        });
      }
    }
  };

  const handleNativeVideoCameraClick = async (e: React.MouseEvent<HTMLLabelElement>) => {
    const isIOS =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;

    if (isIOS) {
      return;
    }

    if (cameraPermissionStatus !== "granted") {
      e.preventDefault();
      const granted = await requestCameraAccess();
      if (granted) {
        setTimeout(() => {
          fileInputVideoCameraRef.current?.click();
        }, 150);
      } else {
        await alert({
          title: "Acceso a Cámara Necesario",
          message: "Para grabar video con la cámara nativa, debes permitir el acceso a la cámara en el navegador.",
          variant: "warning",
          icon: "warning",
        });
      }
    }
  };



  // REGLA DE NEGOCIO: El peritaje técnico de ingreso es un documento legal cerrado e inmutable
  const isPeritajeCerrado = Boolean(
    order &&
      (
        (order.estado !== "PENDIENTE" &&
          order.estado !== "PENDIENTE_PERITAJE" &&
          order.estado !== "INGRESADO") ||
        (order.checklistDanio &&
          (() => {
            try {
              const parsed =
                typeof order.checklistDanio === "string"
                  ? JSON.parse(order.checklistDanio)
                  : order.checklistDanio;
              return Boolean(
                parsed &&
                  (parsed.cerrado === true ||
                    parsed.estadoPeritaje === "COMPLETADO" ||
                    parsed.estadoPeritaje === "CERRADO" ||
                    Boolean(parsed.fechaCierre) ||
                    Boolean(parsed.fechaHoraPeritaje))
              );
            } catch {
              return false;
            }
          })())
      )
  );

  const effectiveReadOnly = Boolean(readOnly || isPeritajeCerrado);

  const [selectedMedia, setSelectedMedia] = useState<{ url: string; tipo?: string; descripcion?: string } | null>(null);

  const activeTestigosList = [
    { key: "checkEngine", label: "Check Engine", active: peritaje.lucesTestigo?.checkEngine },
    { key: "abs", label: "ABS", active: peritaje.lucesTestigo?.abs },
    { key: "airbag", label: "Airbag", active: peritaje.lucesTestigo?.airbag },
    { key: "bateria", label: "Batería / Alternador", active: peritaje.lucesTestigo?.bateria },
    { key: "temperatura", label: "Temperatura", active: peritaje.lucesTestigo?.temperatura },
    { key: "presionAceite", label: "Presión de Aceite", active: peritaje.lucesTestigo?.presionAceite },
    { key: "frenoManoDesgaste", label: "Freno / Pastillas", active: peritaje.lucesTestigo?.frenoManoDesgaste },
    { key: "direccionAsistida", label: "Dirección Asistida", active: peritaje.lucesTestigo?.direccionAsistida },
  ]
    .filter((t) => t.active)
    .map((t) => t.label);

  const allEvidencePhotos = Array.from(
    new Set([
      ...(Array.isArray(peritaje.fotosPeritajeUrls) ? peritaje.fotosPeritajeUrls : []),
      ...(Array.isArray(order?.multimedia) ? order.multimedia.map((m: any) => m.urlStorage || m.url) : []),
    ])
  ).filter(Boolean);

  const clienteDeclaracion =
    peritaje.comentariosDuenio?.trim() ||
    order?.comentariosDuenio?.trim() ||
    (typeof order?.checklistDanio === "string" && !order.checklistDanio.startsWith("{")
      ? order.checklistDanio.trim()
      : "");

  if (!isOpen) return null;

  const handleToggleTestigo = (key: keyof LucesTestigoTablero) => {
    if (key === "otrosTestigos") return;
    setPeritaje({
      ...peritaje,
      lucesTestigo: {
        ...(peritaje.lucesTestigo || {}),
        [key]: !(peritaje.lucesTestigo as any)?.[key],
      },
    });
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const files = Array.from(inputEl.files || []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v|avi|quicktime)$/i.test(file.name);

        let fileToUpload: File | Blob = file;
        if (!isVideo) {
          setUploadMsg(
            files.length > 1
              ? `Comprimiendo imagen ${i + 1} de ${files.length}...`
              : "Comprimiendo imagen de peritaje en navegador..."
          );

          const { file: compressedFile, originalSize, compressedSize } = await compressImageClient(file);
          fileToUpload = compressedFile;
          setUploadMsg(
            files.length > 1
              ? `Subiendo imagen ${i + 1} de ${files.length}...`
              : `Comprimido: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB. Subiendo...`
          );
        } else {
          // Pre-validación de tamaño para videos (evita error 413 de Vercel)
          if (file.size > MAX_PAYLOAD_SIZE) {
            const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
            await alert({
              title: "Video demasiado grande",
              message: `El video "${file.name}" pesa ${sizeMb} MB, lo que supera el límite de 4.5 MB soportado por el servidor en la nube.\n\n💡 Opciones:\n1. Usá la opción "Video en Vivo (Recomendado)" que comprime automáticamente hasta 30 segundos.\n2. O grabá una toma más breve (de 5 a 10 segundos) o en menor resolución (HD 720p) desde la cámara del celular.`,
              variant: "warning",
              icon: "warning",
            });
            continue;
          }

          setUploadMsg(
            files.length > 1
              ? `Subiendo video ${i + 1} de ${files.length} (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`
              : `Subiendo video de peritaje (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`
          );
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);
        formData.append("folder", "multimedia");

        const res = await fetch("/api/upload", { method: "POST", body: formData });
        let data: any = null;
        if (!res.ok) {
          let errMsg = `Error del servidor (${res.status})`;
          try {
            const text = await res.text();
            try {
              const parsed = JSON.parse(text);
              errMsg = parsed.error || errMsg;
            } catch {
              if (res.status === 413 || text.includes("FUNCTION_PAYLOAD_TOO_LARGE") || text.includes("Too Large")) {
                errMsg = "El video es demasiado grande para el servidor (máx. 4.5MB en Vercel). Grabá un video más corto o usá la cámara en vivo integrada.";
              } else if (text) {
                errMsg = text.slice(0, 120);
              }
            }
          } catch {}
          throw new Error(errMsg);
        } else {
          data = await res.json();
        }

        // Guardar en multimedia de la orden
        await fetch(`/api/work-orders/${order.id}/multimedia`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urlStorage: data.file.url,
            tipo: isVideo ? "VIDEO" : "FOTO",
            etiqueta: "PERITAJE_INGRESO",
            descripcion: isVideo
              ? "Video de evidencia de peritaje de ingreso (ruidos o falla)"
              : "Evidencia de peritaje de ingreso (daño o testigo preexistente)",
          }),
        });

        const newPhotoItem = {
          id: data.file.id || `uploaded-${Date.now()}-${i}`,
          urlStorage: data.file.url,
          url: data.file.url,
          tipo: isVideo ? "VIDEO" : "FOTO",
          etiqueta: "PERITAJE_INGRESO",
          descripcion: isVideo
            ? "Video de evidencia de peritaje de ingreso (ruidos o falla)"
            : "Evidencia de peritaje de ingreso (daño o testigo preexistente)",
        };
        setUploadedPhotos((prev) => [newPhotoItem, ...prev]);
      }

      setUploadMsg(
        files.length > 1
          ? `¡${files.length} archivos resguardados en la nube con éxito!`
          : "¡Archivo multimedia de peritaje resguardado en la nube con éxito!"
      );
      setTimeout(() => setUploadMsg(null), 3000);
      onSaved();
    } catch (err: any) {
      setUploadMsg("Error al subir archivo de peritaje: " + (err.message || "desconocido"));
    } finally {
      setUploading(false);
      try {
        inputEl.value = "";
      } catch {}
      if (fileInputCameraRef.current) {
        try {
          fileInputCameraRef.current.value = "";
        } catch {}
      }
      if (fileInputVideoCameraRef.current) {
        try {
          fileInputVideoCameraRef.current.value = "";
        } catch {}
      }
    }
  };

  const handleCameraCapture = async (file: File, tipo: "FOTO" | "VIDEO" = "FOTO") => {
    setUploading(true);
    const isVideo = tipo === "VIDEO" || file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);

    if (isVideo && file.size > MAX_PAYLOAD_SIZE) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setUploading(false);
      await alert({
        title: "Video demasiado grande",
        message: `El video grabado (${sizeMb} MB) supera el límite de 4.5 MB. Grabá una toma más breve (hasta 25-30 segundos).`,
        variant: "warning",
      });
      return;
    }

    setUploadMsg(isVideo ? `Subiendo video grabado (${(file.size / (1024 * 1024)).toFixed(1)}MB)...` : "Comprimiendo y subiendo foto de cámara...");
    try {
      let fileToUpload: File | Blob = file;
      if (!isVideo) {
        const { file: compressedFile, compressedSize } = await compressImageClient(file);
        fileToUpload = compressedFile;
        setUploadMsg(`Subiendo foto (${(compressedSize / 1024).toFixed(0)}KB)...`);
      } else {
        setUploadMsg(`Subiendo video (${(file.size / (1024 * 1024)).toFixed(1)}MB)...`);
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      formData.append("folder", "multimedia");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      let data: any = null;
      if (!res.ok) {
        let errMsg = `Error del servidor (${res.status})`;
        try {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text);
            errMsg = parsed.error || errMsg;
          } catch {
            if (res.status === 413 || text.includes("FUNCTION_PAYLOAD_TOO_LARGE") || text.includes("Too Large")) {
              errMsg = "El video es demasiado grande para el servidor (máx. 4.5MB en Vercel). Grabá un video más corto o usá la cámara en vivo integrada.";
            } else if (text) {
              errMsg = text.slice(0, 120);
            }
          }
        } catch {}
        throw new Error(errMsg);
      } else {
        data = await res.json();
      }

      await fetch(`/api/work-orders/${order.id}/multimedia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urlStorage: data.file.url,
          tipo: isVideo ? "VIDEO" : "FOTO",
          etiqueta: "PERITAJE_INGRESO",
          descripcion: isVideo
            ? "Video de peritaje tomado con cámara en vivo (ruidos o falla)"
            : "Fotografía de peritaje tomada con cámara en vivo",
        }),
      });

      const newPhotoItem = {
        id: data.file.id || `uploaded-${Date.now()}`,
        urlStorage: data.file.url,
        url: data.file.url,
        tipo: isVideo ? "VIDEO" : "FOTO",
        etiqueta: "PERITAJE_INGRESO",
        descripcion: isVideo
          ? "Video de peritaje tomado con cámara en vivo (ruidos o falla)"
          : "Fotografía de peritaje tomada con cámara en vivo",
      };
      setUploadedPhotos((prev) => [newPhotoItem, ...prev]);
      setUploadMsg(isVideo ? "¡Video de peritaje resguardado con éxito en la nube!" : "¡Foto capturada y resguardada con éxito en la nube!");
      setTimeout(() => setUploadMsg(null), 3000);
      onSaved();
    } catch (err: any) {
      setUploadMsg("Error al subir archivo de cámara: " + (err.message || "desconocido"));
    } finally {
      setUploading(false);
    }
  };

  const handleSavePeritaje = async () => {
    if (effectiveReadOnly) {
      await alert({
        title: "Peritaje Inmutable",
        message: "El peritaje técnico de ingreso ya se encuentra cerrado e inmutable. Por normativa legal y de auditoría, los datos del peritaje no pueden ser modificados una vez asentados.",
        variant: "danger",
        icon: "lock",
      });
      return;
    }

    const isPending = order.estado === "PENDIENTE_PERITAJE" || order.estado === "PENDIENTE" || order.estado === "INGRESADO";
    const targetMechanicId = selectedMechanicId || order?.mechanicId;

    if (isPending && !targetMechanicId) {
      await alert({
        title: "Mecánico Responsable Requerido",
        message: "Un vehículo no puede estar en reparación sin un mecánico responsable asignado. Debe designar un mecánico antes de cerrar el peritaje e iniciar los trabajos técnicos.",
        variant: "warning",
        icon: "warning",
      });
      return;
    }

    const isConfirmed = await confirm({
      title: "Asentamiento y Cierre de Peritaje",
      message:
        "Al asentar este peritaje legal, el documento quedará CERRADO E INMUTABLE.\n\n" +
        "El estado de la orden avanzará a 'Peritado / En reparación' y por resguardo legal y de auditoría NO SE PODRÁ MODIFICAR una vez confirmado.",
      confirmText: "Confirmar y Asentar Definitivamente",
      cancelText: "Seguir editando",
      variant: "warning",
      icon: "shield",
    });

    if (!isConfirmed) {
      return;
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const nowEsAr = new Date().toLocaleString("es-AR");

      const updatedPeritaje: PeritajeIngreso = {
        ...peritaje,
        fechaHoraPeritaje: peritaje.fechaHoraPeritaje || nowEsAr,
        cerrado: true,
        estadoPeritaje: "COMPLETADO",
        fechaCierre: nowIso,
      };

      const patchData: any = {
        nivelNafta: updatedPeritaje.nivelCombustible,
        kilometraje: updatedPeritaje.kilometrajeTablero,
        comentariosDuenio: updatedPeritaje.comentariosDuenio || null,
        checklistDanio: updatedPeritaje,
      };

      // Avanza irreversiblemente el estado a EN_REPARACION
      if (isPending) {
        patchData.estado = "EN_REPARACION";
      }

      if (targetMechanicId && targetMechanicId !== order?.mechanicId) {
        patchData.mechanicId = targetMechanicId;
      }

      const res = await fetch(`/api/work-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });

      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "Error al actualizar peritaje",
          message: data.error || "No se pudo actualizar el peritaje",
          variant: "danger",
          icon: "danger",
        });
        return;
      }

      onSaved();
      await alert({
        title: "Peritaje Asentado con Éxito",
        message: "El peritaje de ingreso ha sido registrado y cerrado satisfactoriamente. Documento legal protegido.",
        variant: "success",
        icon: "success",
      });
      onClose();
    } catch (err: any) {
      console.error("Error guardando peritaje:", err);
      await alert({
        title: "Error de Conexión",
        message: "No se pudo conectar con el servidor para guardar el peritaje. Intente nuevamente.",
        variant: "danger",
        icon: "danger",
      });
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div className="shrink-0 p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                    effectiveReadOnly
                      ? isPeritajeCerrado
                        ? "bg-slate-700/60 text-slate-200 border-slate-600"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                  }`}
                >
                  {effectiveReadOnly ? (
                    <>
                      <Lock className="w-2.5 h-2.5" />
                      <span>{isPeritajeCerrado ? "Peritaje Cerrado (Inmutable)" : "Ficha de Peritaje (Solo Consulta)"}</span>
                    </>
                  ) : (
                    <span>Peritaje de Ingreso</span>
                  )}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-white/10 rounded text-slate-300">
                  Orden #{order.numeroOrden}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 truncate">
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  {order.vehicle.marca} {order.vehicle.modelo}
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono font-black text-xs shrink-0 shadow-xs">
                  {order.vehicle.patente}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {effectiveReadOnly ? (
          <>
            {/* VISTA UNIFICADA: Documento Técnico de Peritaje Realizado */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs pb-8 bg-slate-50/40">
              {/* Tarjeta de Resumen: Datos del Vehículo, Cliente, Fecha y Responsables */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                      Constatación Técnica de Ingreso
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-emerald-700" />
                      Acta Sellada
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{peritaje.fechaHoraPeritaje || (order?.createdAt ? new Date(order.createdAt).toLocaleString("es-AR") : "Al ingreso")}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Vehículo
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs truncate">
                      {order.vehicle?.marca} {order.vehicle?.modelo}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {order.vehicle?.color ? `${order.vehicle.color} • ` : ""}{order.vehicle?.anio || ""}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Cliente / Titular
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs truncate">
                      {order.vehicle?.client ? `${order.vehicle.client.nombre} ${order.vehicle.client.apellido || ""}`.trim() : "Cliente"}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {order.vehicle?.client?.telefono || "Sin teléfono registrado"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Mecánico Responsable
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs truncate flex items-center gap-1">
                      <Wrench className="w-3 h-3 text-sky-600 shrink-0" />
                      <span>{order.mechanic ? `${order.mechanic.nombre} ${order.mechanic.apellido || ""}`.trim() : (peritaje.peritadorNombre || "Taller")}</span>
                    </p>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Peritaje constatado
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                      Odómetro / Nafta
                    </span>
                    <p className="font-extrabold text-slate-900 text-xs">
                      {peritaje.kilometrajeTablero || order.kilometraje || 0} km
                    </p>
                    <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      ⛽ Combustible: {peritaje.nivelCombustible || order.nivelNafta || "1/2"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 1: Lo que indicó el cliente */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Declaración del Cliente al Ingresar la Unidad
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                    {order.vehicle?.client ? `${order.vehicle.client.nombre} ${order.vehicle.client.apellido || ""}`.trim() : "Propietario"}
                  </span>
                </div>

                {clienteDeclaracion ? (
                  <div className="p-3.5 bg-white rounded-xl border border-amber-300 shadow-2xs">
                    <p className="text-slate-900 text-xs font-bold leading-relaxed">
                      &ldquo;{clienteDeclaracion}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-slate-600 text-xs italic">
                    El cliente no manifestó daños, fallas ni ruidos previos al momento de la recepción.
                  </div>
                )}
              </div>

              {/* Sección 2: Lo que marcó el mecánico (Constatación técnica) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
                  <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                    Constatación Técnica Realizada por el Mecánico
                  </span>
                </div>

                {/* Esquema del vehículo con pines de daño */}
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-sky-600" />
                      <span>Diagrama de Carrocería y Daños Visuales</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {(peritaje.damagePins?.length || 0) + (peritaje.daniosCarroceria?.length || 0)} marcaciones
                    </span>
                  </div>

                  <CarDamageBlueprint
                    pins={peritaje.damagePins || []}
                    readOnly={true}
                  />

                  {/* Daños adicionales cargados manualmente sin pin (si existen) */}
                  {peritaje.daniosCarroceria && peritaje.daniosCarroceria.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        Otros Daños de Carrocería Registrados ({peritaje.daniosCarroceria.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {peritaje.daniosCarroceria.map((d: any, idx: number) => (
                          <div
                            key={`danio-${idx}`}
                            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-[11px] block truncate">
                                {d.zona}
                              </span>
                              <span className="text-[10px] text-slate-600 block truncate">
                                {d.descripcion}
                              </span>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 shrink-0">
                              {d.tipo?.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!peritaje.damagePins || peritaje.damagePins.length === 0) &&
                   (!peritaje.daniosCarroceria || peritaje.daniosCarroceria.length === 0) && (
                    <div className="p-3 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      ✨ Sin abolladuras ni rayones detectados en carrocería al ingresar.
                    </div>
                  )}
                </div>

                {/* Cristales y Ópticas */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-sky-600" />
                    <span>Estado de Cristales y Ópticas</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        label: "Parabrisas",
                        bad: peritaje.cristalesYOpticas?.parabrisasRajado,
                        badText: "Rajado / Picado",
                        goodText: "En buen estado",
                      },
                      {
                        label: "Ópticas Delanteras",
                        bad: peritaje.cristalesYOpticas?.opticasDelanterasDanadas,
                        badText: "Fisuras / Dañadas",
                        goodText: "En buen estado",
                      },
                      {
                        label: "Faros Traseros",
                        bad: peritaje.cristalesYOpticas?.farosTraserosRotos,
                        badText: "Rotos / Rajados",
                        goodText: "En buen estado",
                      },
                      {
                        label: "Espejos Retrovisores",
                        bad: peritaje.cristalesYOpticas?.espejosRetrovisoresRotos,
                        badText: "Rotos / Faltantes",
                        goodText: "En buen estado",
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-center ${
                          item.bad
                            ? "bg-rose-50 border-rose-200 text-rose-800"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {item.label}
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            item.bad ? "text-rose-700" : "text-emerald-700"
                          }`}
                        >
                          {item.bad ? `⚠️ ${item.badText}` : `✓ ${item.goodText}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Luces Testigo del Tablero */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-rose-600" />
                    <span>Testigos del Tablero / Luces de Falla</span>
                  </span>
                  {activeTestigosList.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {activeTestigosList.map((testigo, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-bold text-[11px] flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {testigo} (Encendido)
                          </span>
                        ))}
                      </div>
                      {peritaje.lucesTestigo?.otrosTestigos && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <strong>Otros avisos en pantalla:</strong> {peritaje.lucesTestigo.otrosTestigos}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Sin luces de anomalía encendidas en el tablero al poner en contacto.</span>
                    </div>
                  )}
                </div>

                {/* Elementos e Inventario en Cabina / Baúl */}
                <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-600" />
                    <span>Inventario Verificado de Cabina y Baúl</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: "ruedaAuxilio", label: "Rueda de Auxilio" },
                      { key: "criqueYHerramientas", label: "Crique y Llave" },
                      { key: "tuercaSeguridad", label: "Tuerca Antirrobo" },
                      { key: "documentacion", label: "Cédula / Papeles" },
                      { key: "estereoFunciona", label: "Estéreo / Pantalla" },
                      { key: "matafuegoVigente", label: "Matafuego en regla" },
                      { key: "tapaCombustible", label: "Tapa Combustible" },
                    ].map(({ key, label }) => {
                      const present = Boolean((peritaje.inventarioCabina as any)?.[key]);
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-2 rounded-xl border text-[11px] ${
                            present
                              ? "bg-emerald-50/90 border-emerald-300 text-emerald-900 font-bold"
                              : "bg-slate-50/60 border-slate-200 text-slate-400 opacity-60"
                          }`}
                        >
                          <span className="truncate pr-1">{label}</span>
                          {present ? (
                            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center shrink-0">
                              <X className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Observaciones Adicionales del Mecánico */}
                {peritaje.observacionesGenerales?.trim() && (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-1.5">
                    <span className="font-bold text-slate-800 text-xs block">
                      Observaciones Técnicas Generales del Mecánico:
                    </span>
                    <p className="text-slate-700 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed font-medium">
                      {peritaje.observacionesGenerales.trim()}
                    </p>
                  </div>
                )}

                {/* Fotografías y Videos de Evidencia */}
                {allEvidencePhotos.length > 0 && (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Evidencias Multimedia ({allEvidencePhotos.length})</span>
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {allEvidencePhotos.map((mediaUrl: string, idx: number) => {
                        const isVid = /\.(mp4|webm|mov|m4v|avi)$/i.test(mediaUrl) || mediaUrl.includes("video");
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedMedia({ url: mediaUrl, tipo: isVid ? "VIDEO" : "FOTO" })}
                            className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-900 group cursor-pointer hover:opacity-90 transition-all shadow-xs"
                          >
                            {isVid ? (
                              <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                                <video
                                  src={mediaUrl}
                                  preload="metadata"
                                  className="w-full h-full object-cover opacity-75"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-7 h-7 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={mediaUrl}
                                alt={`Evidencia ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/75 text-white flex items-center gap-1">
                              {isVid ? (
                                <>
                                  <Video className="w-2.5 h-2.5 text-rose-400" />
                                  <span>Video {idx + 1}</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-2.5 h-2.5 text-sky-400" />
                                  <span>Foto {idx + 1}</span>
                                </>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie de modal para Vista Unificada */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-600 text-xs">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-800">Acta de Peritaje Inmutable</span>
                <span className="hidden sm:inline text-slate-500">• Constatación legal de ingreso</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Barra de pestañas responsiva (Segmented Control) */}
            <div className="shrink-0 p-1.5 sm:p-2 bg-slate-100/90 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab("TABLERO")}
                  className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all text-center cursor-pointer ${
                    activeTab === "TABLERO"
                      ? "bg-white text-slate-950 font-black shadow-xs ring-1 ring-slate-900/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
                  }`}
                >
                  <Gauge
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeTab === "TABLERO" ? "text-rose-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate text-[10px] sm:text-xs">
                    <span className="hidden sm:inline">1. </span>Tablero
                  </span>
                  {Object.values(peritaje?.lucesTestigo || {}).filter(Boolean).length > 0 && (
                    <span className="px-1 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-bold">
                      {Object.values(peritaje?.lucesTestigo || {}).filter(Boolean).length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("CARROCERIA")}
                  className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all text-center cursor-pointer ${
                    activeTab === "CARROCERIA"
                      ? "bg-white text-slate-950 font-black shadow-xs ring-1 ring-slate-900/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
                  }`}
                >
                  <Car
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeTab === "CARROCERIA" ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate text-[10px] sm:text-xs">
                    <span className="hidden sm:inline">2. </span>Carrocería
                  </span>
                  {((peritaje?.damagePins?.length || 0) + (peritaje?.daniosCarroceria?.length || 0)) > 0 && (
                    <span className="px-1 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[9px] font-bold">
                      {(peritaje?.damagePins?.length || 0) + (peritaje?.daniosCarroceria?.length || 0)}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("INVENTARIO")}
                  className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all text-center cursor-pointer ${
                    activeTab === "INVENTARIO"
                      ? "bg-white text-slate-950 font-black shadow-xs ring-1 ring-slate-900/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
                  }`}
                >
                  <FileCheck
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeTab === "INVENTARIO" ? "text-indigo-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate text-[10px] sm:text-xs">
                    <span className="hidden sm:inline">3. </span>Accesorios
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("FOTOS")}
                  className={`py-2 px-1 rounded-xl flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all text-center cursor-pointer ${
                    activeTab === "FOTOS"
                      ? "bg-white text-slate-950 font-black shadow-xs ring-1 ring-slate-900/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold"
                  }`}
                >
                  <Camera
                    className={`w-3.5 h-3.5 shrink-0 ${
                      activeTab === "FOTOS" ? "text-emerald-600" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate text-[10px] sm:text-xs">
                    <span className="hidden sm:inline">4. </span>Fotos / Videos
                  </span>
                  {order.multimedia?.length > 0 && (
                    <span className="px-1 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold">
                      {order.multimedia.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal de Carga */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs pb-8">
              {/* PESTAÑA 1: TABLERO Y LUCES TESTIGO */}
              {activeTab === "TABLERO" && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-800 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      <strong>Atención mecánica:</strong> Marcar cualquier luz de anomalía que se encuentre encendida en el cuadro de instrumentos al poner en contacto. Esto previene reclamos de testigos activados en el taller.
                    </p>
                  </div>

                  {/* Asignación de Mecánico Responsable */}
                  {!order?.mechanic && (
                    <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 text-sky-900 space-y-1.5">
                      <label className="block text-xs font-bold text-sky-950 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-sky-600" />
                        <span>Mecánico Responsable Asignado <span className="text-rose-600">* (Requerido para avanzar a reparación)</span></span>
                      </label>
                      <p className="text-[11px] text-sky-700">
                        Regla de taller: Todo vehículo peritado debe contar con un mecánico asignado para ingresar a reparación.
                      </p>
                      <select
                        value={selectedMechanicId}
                        onChange={(e) => setSelectedMechanicId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-sky-300 bg-white font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">-- Seleccionar mecánico responsable --</option>
                        {mechanicsList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} {m.apellido || ""} ({m.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {order?.mechanic && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-sky-600" />
                        <span>Mecánico Asignado:</span>
                      </span>
                      <span className="font-extrabold text-slate-900">
                        {order.mechanic.nombre} {order.mechanic.apellido || ""}
                      </span>
                    </div>
                  )}

                  {/* Odómetro y Combustible */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Kilometraje en Odómetro al ingresar:
                      </label>
                      <input
                        type="number"
                        value={peritaje.kilometrajeTablero}
                        onChange={(e) =>
                          setPeritaje({ ...peritaje, kilometrajeTablero: parseInt(e.target.value, 10) || 0 })
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Ej: 78500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nivel de Combustible:
                      </label>
                      <div className="grid grid-cols-5 gap-1 text-[10px]">
                        {["VACIO", "1/4", "1/2", "3/4", "LLENO"].map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setPeritaje({ ...peritaje, nivelCombustible: lvl })}
                            className={`py-1.5 rounded-lg font-bold border transition-colors cursor-pointer ${
                              peritaje.nivelCombustible === lvl
                                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {lvl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botonera de Luces Testigo Preexistentes */}
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-2">
                      Testigos Lumínicos Previamente Encendidos (Falla Preexistente):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: "checkEngine", label: "Check Engine (Motor)", color: "text-amber-600 bg-amber-50 border-amber-300" },
                        { key: "abs", label: "ABS (Frenos)", color: "text-amber-600 bg-amber-50 border-amber-300" },
                        { key: "airbag", label: "Airbag", color: "text-rose-600 bg-rose-50 border-rose-300" },
                        { key: "presionAceite", label: "Presión de Aceite", color: "text-rose-600 bg-rose-50 border-rose-300" },
                        { key: "temperatura", label: "Temperatura / Agua", color: "text-rose-600 bg-rose-50 border-rose-300" },
                        { key: "bateria", label: "Batería / Carga", color: "text-rose-600 bg-rose-50 border-rose-300" },
                        { key: "frenoManoDesgaste", label: "Pastillas Desgastadas", color: "text-amber-600 bg-amber-50 border-amber-300" },
                        { key: "direccionAsistida", label: "Dirección Asistida (EPS)", color: "text-amber-600 bg-amber-50 border-amber-300" },
                      ].map(({ key, label, color }) => {
                        const isChecked = peritaje.lucesTestigo[key as keyof LucesTestigoTablero];
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleToggleTestigo(key as keyof LucesTestigoTablero)}
                            className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                              isChecked
                                ? `${color} ring-2 ring-rose-500 font-bold shadow-sm`
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <span className="text-[11px] block">{label}</span>
                            <span className={`text-[10px] mt-2 font-mono font-bold ${isChecked ? "text-rose-700" : "text-slate-400"}`}>
                              {isChecked ? "🔴 ENCENDIDO" : "⚪ Apagado"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Otros testigos o mensajes de anomalía en pantalla:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Mensaje 'Service ahora', luz de control de estabilidad parpadeando..."
                      value={peritaje.lucesTestigo.otrosTestigos || ""}
                      onChange={(e) =>
                        setPeritaje({
                          ...peritaje,
                          lucesTestigo: { ...peritaje.lucesTestigo, otrosTestigos: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 2: CARROCERÍA, GOLPES Y RAYONES */}
              {activeTab === "CARROCERIA" && (
                <div className="space-y-4">
                  {/* Declaración Inicial del Dueño (Solo Lectura para el Mecánico) */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                          Declaración / Peritaje Inicial del Dueño
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900 border border-amber-300/60">
                          <Lock className="w-2.5 h-2.5 text-amber-800" />
                          Solo Lectura
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200/70 text-amber-900">
                          {order.vehicle?.client ? `${order.vehicle.client.nombre} ${order.vehicle.client.apellido || ""}`.trim() : "Propietario"}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-900 leading-tight">
                      Abolladuras, rayones y desperfectos preexistentes manifestados por el propietario al ingresar la unidad (guía de inspección):
                    </p>

                    {peritaje.comentariosDuenio?.trim() ? (
                      <div className="p-3.5 bg-white rounded-xl border border-amber-300 shadow-xs space-y-2">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base select-none leading-none mt-0.5">💬</span>
                          <p className="text-slate-900 text-xs font-bold leading-relaxed">
                            &ldquo;{peritaje.comentariosDuenio.trim()}&rdquo;
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/70 font-medium">
                          <span>👁️</span>
                          <span>
                            Verificá estas áreas declaradas por el cliente al marcar los daños y pines en la carrocería abajo.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-slate-600 text-xs italic flex items-center gap-2">
                        <span className="text-amber-500 font-bold not-italic">ℹ️</span>
                        <span>El cliente no declaró daños previos al momento de la recepción de la unidad.</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700">
                    <span className="font-bold text-slate-900 block mb-1">
                      Mapeo Visual de Daños Estéticos Preexistentes (Esquema del Auto)
                    </span>
                    <p className="text-[11px]">
                      Hacé &ldquo;tap&rdquo; o clic sobre la silueta del auto para colocar pines de rayones, abolladuras o roturas con sus coordenadas (X, Y).
                    </p>
                  </div>

                  {/* Componente Visual Interactivo del Auto (Tap-to-Pin) */}
                  <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-inner">
                    <CarDamageBlueprint
                      pins={peritaje.damagePins || []}
                      readOnly={false}
                      onChange={(pins) => setPeritaje({ ...peritaje, damagePins: pins })}
                    />
                  </div>

                  {/* Estado de Cristales y Ópticas al Ingresar */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-sky-600" />
                        <span>Estado de Cristales y Ópticas al Ingresar:</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: "parabrisasRajado", label: "Parabrisas Rajado o con Picaduras" },
                        { key: "opticasDelanterasDanadas", label: "Ópticas Delanteras Fisuradas / Opacas" },
                        { key: "farosTraserosRotos", label: "Faros / Luces Traseras Rotas" },
                        { key: "espejosRetrovisoresRotos", label: "Espejos Retrovisores Rotos / Dañados" },
                      ].map(({ key, label }) => {
                        const checked = (peritaje.cristalesYOpticas as any)[key];
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] transition-colors cursor-pointer ${
                              checked
                                ? "bg-rose-50 border-rose-300 font-bold text-rose-800"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setPeritaje({
                                  ...peritaje,
                                  cristalesYOpticas: {
                                    ...peritaje.cristalesYOpticas,
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA 3: ACCESORIOS Y DETALLES */}
              {activeTab === "INVENTARIO" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-900">
                        Accesorios y Elementos Recibidos en Cabina / Baúl:
                      </label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { key: "ruedaAuxilio", label: "Rueda de Auxilio" },
                        { key: "criqueYHerramientas", label: "Crique y Llave" },
                        { key: "tuercaSeguridad", label: "Tuerca Antirrobo" },
                        { key: "documentacion", label: "Cédula / Documentos" },
                        { key: "estereoFunciona", label: "Estéreo / Pantalla" },
                        { key: "matafuegoVigente", label: "Matafuego en regla" },
                        { key: "tapaCombustible", label: "Tapa Combustible" },
                      ].map(({ key, label }) => {
                        const checked = (peritaje.inventarioCabina as any)[key];
                        return (
                          <label
                            key={key}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border text-[11px] transition-colors cursor-pointer ${
                              checked
                                ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-900 shadow-2xs"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setPeritaje({
                                  ...peritaje,
                                  inventarioCabina: {
                                    ...peritaje.inventarioCabina,
                                    [key]: e.target.checked,
                                  },
                                })
                              }
                              className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                            />
                            <span className="truncate">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Observaciones del Mecánico sobre el Vehículo:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="El mecánico puede ingresar aquí cualquier observación sobre el vehículo (estado general, ruidos, desgastes o detalles detectados)..."
                      value={peritaje.observacionesGenerales}
                      onChange={(e) =>
                        setPeritaje({ ...peritaje, observacionesGenerales: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-xs font-medium resize-none"
                    />
                  </div>
                </div>
              )}

              {/* PESTAÑA 4: FOTOS DE EVIDENCIA EN LA NUBE */}
              {activeTab === "FOTOS" && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700">
                    <span className="font-bold text-slate-900 block mb-1">
                      Fotografías Inalterables de Peritaje
                    </span>
                    <p className="text-[11px]">
                      Tomá fotos directas del tablero con kilometraje, luces testigo encendidas y fotos de los golpes o rajaduras. Se comprimen en el dispositivo y se guardan en la nube.
                    </p>
                  </div>

                  {/* Estado y Solicitud de Permiso de Cámara Nativa */}
                  {cameraPermissionStatus !== "granted" && (
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-center justify-between gap-3">
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold flex items-center gap-1.5 mb-0.5">
                          <Camera className="w-3.5 h-3.5 text-amber-700" />
                          Permiso de Cámara Nativa
                        </span>
                        <span className="text-amber-800">
                          Para que tu celular (Android o iOS) abra la cámara nativa directamente en vez de la galería, solicitá el permiso del navegador:
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={requestCameraAccess}
                        disabled={isRequestingPermission}
                        className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-[11px] font-bold shrink-0 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {isRequestingPermission ? "Solicitando..." : "Solicitar Acceso"}
                      </button>
                    </div>
                  )}

                  {cameraPermissionStatus === "granted" && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-2 text-[11px] font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Acceso a cámara nativa habilitado (Android / iOS)</span>
                    </div>
                  )}

                  {cameraPermissionStatus === "denied" && (
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 text-[11px]">
                      <span className="font-bold flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Acceso a cámara denegado
                      </span>
                      <span>
                        El permiso de cámara fue bloqueado en este navegador. Habilitalo en los ajustes del navegador o usá el botón de "Subir desde Galería / Archivos".
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Botón 1: Sacar foto con la cámara nativa del celular (Android / iOS) */}
                    <label
                      onClick={handleNativeCameraClick}
                      className={`flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-3.5 px-2 rounded-2xl text-xs shadow-md transition-all cursor-pointer text-center ${
                        uploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Camera className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{uploading ? "..." : "Sacar Foto"}</span>
                      <input
                        ref={fileInputCameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        disabled={uploading}
                        className="sr-only"
                      />
                    </label>

                    {/* Botón 2: Grabar video con la cámara integrada (comprimida y optimizada <4.5MB) */}
                    <button
                      type="button"
                      onClick={() => {
                        setCameraInitialMode("VIDEO");
                        setIsCameraModalOpen(true);
                      }}
                      disabled={uploading}
                      className={`flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold py-3.5 px-2 rounded-2xl text-xs shadow-md transition-all cursor-pointer text-center ${
                        uploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Video className="w-4 h-4 text-white shrink-0 animate-pulse" />
                      <span>Video en Vivo</span>
                    </button>

                    {/* Botón 3: Grabar video con la cámara nativa del celular */}
                    <label
                      onClick={handleNativeVideoCameraClick}
                      className={`flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-white font-bold py-3.5 px-2 rounded-2xl text-xs shadow-md transition-all cursor-pointer text-center ${
                        uploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Video className="w-4 h-4 text-rose-300 shrink-0" />
                      <span>Video Celular</span>
                      <input
                        ref={fileInputVideoCameraRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        disabled={uploading}
                        className="sr-only"
                      />
                    </label>

                    {/* Botón 4: Subir fotos o videos desde la galería o archivos */}
                    <label
                      className={`flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 active:scale-[0.99] text-slate-800 font-bold py-3.5 px-2 rounded-2xl text-xs border border-slate-300 shadow-xs transition-all cursor-pointer text-center ${
                        uploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Galería / Archivos</span>
                      <input
                        type="file"
                        accept="image/*,video/*,video/mp4,video/webm,video/quicktime"
                        multiple
                        onChange={handlePhotoCapture}
                        disabled={uploading}
                        className="sr-only"
                      />
                    </label>
                  </div>

                  {/* Consejo de optimización para videos en la nube */}
                  <div className="flex items-start gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-snug">
                    <Info className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Consejo para videos:</strong> En la nube el límite es de <strong>4.5 MB</strong> por archivo. Con <strong>"Video en Vivo"</strong> el video se comprime y optimiza automáticamente (hasta 30 seg). Si grabás con la cámara nativa del celular, hacé tomas breves de 5 a 10 seg.
                    </span>
                  </div>

                  {/* Enlace alternativo para PC / webcam */}
                  <div className="text-center pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraInitialMode("FOTO");
                        setIsCameraModalOpen(true);
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                    >
                      ¿Estás en computadora / PC? Abrir cámara web para sacar fotos
                    </button>
                  </div>

                  {uploadMsg && (
                    <div
                      className={`p-3 rounded-xl text-center font-medium text-xs flex items-center justify-center gap-2 ${
                        uploadMsg.toLowerCase().includes("error")
                          ? "bg-rose-50 text-rose-800 border border-rose-200"
                          : uploadMsg.includes("Comprimiendo") || uploadMsg.includes("Subiendo")
                          ? "bg-sky-50 text-sky-800 border border-sky-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {uploadMsg.toLowerCase().includes("error") && (
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      {uploadMsg.toLowerCase().includes("éxito") && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>{uploadMsg}</span>
                    </div>
                  )}

                  {/* Muestra de fotos y videos existentes y recién subidos en la orden */}
                  {(() => {
                    const allMedia = [...uploadedPhotos, ...(order.multimedia || [])];
                    const videoCount = allMedia.filter(
                      (item: any) => item.tipo === "VIDEO" || /\.(mp4|webm|mov)$/i.test(item.urlStorage || item.url || "")
                    ).length;
                    const photoCount = allMedia.length - videoCount;

                    return allMedia.length > 0 ? (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Archivos registrados ({allMedia.length}):
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {photoCount} {photoCount === 1 ? "foto" : "fotos"} • {videoCount} {videoCount === 1 ? "video" : "videos"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {allMedia.map((item: any, idx: number) => {
                            const isVid =
                              item.tipo === "VIDEO" ||
                              /\.(mp4|webm|mov|m4v)$/i.test(item.urlStorage || item.url || "");
                            const mediaUrl = item.urlStorage || item.url;
                            return (
                              <div
                                key={item.id || idx}
                                onClick={() => setSelectedMedia({ url: mediaUrl, tipo: isVid ? "VIDEO" : "FOTO", descripcion: item.descripcion })}
                                className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-900 group cursor-pointer hover:opacity-90 transition-all shadow-xs"
                              >
                                {isVid ? (
                                  <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                                    <video
                                      src={mediaUrl}
                                      preload="metadata"
                                      className="w-full h-full object-cover opacity-75"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <Play className="w-4 h-4 fill-white ml-0.5" />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={mediaUrl}
                                    alt="Evidencia"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  />
                                )}
                                <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/75 text-white flex items-center gap-1">
                                  {isVid ? (
                                    <>
                                      <Video className="w-2.5 h-2.5 text-rose-400" />
                                      <span>VIDEO</span>
                                    </>
                                  ) : (
                                    <span>{item.etiqueta || "FOTO"}</span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                        Sin fotografías o videos registrados en el peritaje de esta orden.
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Footer de Wizard con Navegación Anterior / Siguiente y Cierre */}
            <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {/* Botón Anterior */}
              <div>
                {currentTabIndex > 0 ? (
                  <button
                    type="button"
                    onClick={handlePrevTab}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Cerrar
                  </button>
                )}
              </div>

              {/* Botones Derecha: Siguiente y/o Asentar Peritaje */}
              <div className="flex items-center gap-2">
                {currentTabIndex < TABS.length - 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSavePeritaje}
                      disabled={saving}
                      className="hidden sm:inline-flex px-3.5 py-2.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
                      title="Asentar peritaje sin avanzar de solapa"
                    >
                      <span>Finalizar Peritaje</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextTab}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <span>Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleSavePeritaje}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saving ? "Asentando..." : "Asentar y Cerrar Peritaje"}</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Visualizador ampliado de fotografía o reproductor de video */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {selectedMedia.tipo === "VIDEO" || /\.(mp4|webm|mov|m4v)$/i.test(selectedMedia.url) ? (
              <video
                src={selectedMedia.url}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={selectedMedia.url}
                alt="Foto de peritaje ampliada"
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />
            )}
            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="px-6 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1.5 shadow-lg"
            >
              <X className="w-4 h-4" />
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Cámara en vivo (WebRTC / In-App Viewfinder) */}
      <InAppCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCameraCapture}
        initialMode={cameraInitialMode}
      />
    </div>
  );
}
