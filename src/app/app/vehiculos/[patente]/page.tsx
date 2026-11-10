"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import ModalPortal from "@/components/ModalPortal";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Wrench,
  History,
  CheckCircle2,
  FileText,
  ChevronRight,
  Plus,
  Fuel,
  Gauge,
  X,
  AlertCircle,
  Phone,
  Camera,
  Image as ImageIcon,
  Maximize2,
  Download,
  ExternalLink,
  Play,
  Calendar,
} from "lucide-react";
import { useAppDialog } from "@/components/AppDialog";

export default function VehiculoHistorialClinicoPage() {
  const { alert, confirm } = useAppDialog();
  const { patente } = useParams();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [clinicalStats, setClinicalStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Estados de Pestañas y Galería
  const [activeTab, setActiveTab] = useState<"ordenes" | "galeria">("ordenes");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("TODAS");

  const fetchVehicle = async () => {
    try {
      const res = await fetch(`/api/vehicles/${patente}`);
      if (res.ok) {
        const data = await res.json();
        setVehicle(data.vehicle);
        setClinicalStats(data.clinicalStats);
      }
    } catch (err) {
      console.error("Error al cargar ficha del vehículo:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicle();
  }, [patente]);

  const isCancelledOrder = (o: any) => {
    return Boolean(
      o &&
      (o.estado === "CANCELADO" ||
        o.motivoCancelacion ||
        (() => {
          try {
            const p = typeof o.checklistDanio === "string" ? JSON.parse(o.checklistDanio) : o.checklistDanio;
            return Boolean(p?.motivoCancelacion);
          } catch {
            return false;
          }
        })())
    );
  };

  const activeOrder = vehicle?.workOrders?.find(
    (o: any) =>
      o.estado !== "FINALIZADO" &&
      o.estado !== "REPARADO" &&
      o.estado !== "TERMINADO" &&
      o.estado !== "ENTREGADO" &&
      o.estado !== "ARCHIVADO" &&
      o.estado !== "CANCELADO" &&
      !isCancelledOrder(o)
  );

  const openNewOrderModal = async () => {
    if (!vehicle) return;
    if (activeOrder) {
      await alert({
        title: "Orden Activa en Taller",
        message: `Este vehículo ya se encuentra en el taller con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}). No se puede abrir una nueva orden simultánea.`,
        variant: "warning",
      });
      return;
    }
    // Navegar a la página de órdenes con deep-link para abrir modal en paso 3
    const clientId = vehicle.clientId || vehicle.client?.id || "";
    const vehicleId = vehicle.id || "";
    router.push(`/app/ordenes?newOrder=1&clientId=${clientId}&vehicleId=${vehicleId}`);
  };

  // Recopilar exhaustivamente todas las fotos vinculadas al vehículo
  const allVehiclePhotos = useMemo(() => {
    if (!vehicle?.workOrders) return [];
    const list: any[] = [];
    const seenUrls = new Set<string>();

    vehicle.workOrders.forEach((order: any) => {
      // 1. Fotos de WorkLogs (Arreglos mecánicos y notas diarias)
      if (order.workLogs && Array.isArray(order.workLogs)) {
        order.workLogs.forEach((log: any) => {
          let fotos: any[] = [];
          try {
            if (log.fotos) {
              fotos = typeof log.fotos === "string" ? JSON.parse(log.fotos) : log.fotos;
            }
          } catch {}

          if (Array.isArray(fotos)) {
            fotos.forEach((f: any, fIdx: number) => {
              const url = typeof f === "string" ? f : f?.url;
              if (url && !seenUrls.has(url)) {
                seenUrls.add(url);
                list.push({
                  id: `worklog-${log.id}-${fIdx}`,
                  url,
                  tipo: "FOTO",
                  categoria: "ARREGLO",
                  categoriaLabel: "Arreglo / Bitácora",
                  titulo: log.descripcionTarea || "Arreglo técnico",
                  descripcion: log.mechanic
                    ? `Mecánico: ${log.mechanic.nombre} ${log.mechanic.apellido || ""}`
                    : undefined,
                  fecha: log.fechaRegistro || order.fechaIngreso,
                  orderId: order.id,
                  numeroOrden: order.numeroOrden,
                });
              }
            });
          }
        });
      }

      // 2. Fotos y Videos de Multimedia (Peritajes, Ingreso, Evidencia general)
      if (order.multimedia && Array.isArray(order.multimedia)) {
        order.multimedia.forEach((m: any) => {
          const url = m.urlStorage || m.url;
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            const isVid =
              m.tipo === "VIDEO" ||
              /\.(mp4|webm|mov|m4v|avi|3gp|3gpp|mkv)$/i.test(url);
            const isPeritaje =
              m.etiqueta === "INGRESO" ||
              m.etiqueta === "PERITAJE" ||
              (m.descripcion && m.descripcion.toLowerCase().includes("peritaje"));

            list.push({
              id: `media-${m.id}`,
              url,
              tipo: isVid ? "VIDEO" : "FOTO",
              categoria: isPeritaje ? "PERITAJE" : "GENERAL",
              categoriaLabel: isPeritaje ? "Peritaje e Ingreso" : (m.etiqueta || "Evidencia"),
              titulo: m.descripcion || `Evidencia Orden #${order.numeroOrden}`,
              descripcion: m.etiqueta ? `Etiqueta: ${m.etiqueta}` : undefined,
              fecha: m.fechaCarga || order.fechaIngreso,
              orderId: order.id,
              numeroOrden: order.numeroOrden,
            });
          }
        });
      }

      // 3. Fotos en checklistDanio
      if (order.checklistDanio) {
        try {
          const p =
            typeof order.checklistDanio === "string"
              ? JSON.parse(order.checklistDanio)
              : order.checklistDanio;
          const danioFotos = p?.fotosDanio || p?.evidencias || p?.fotos || [];
          if (Array.isArray(danioFotos)) {
            danioFotos.forEach((f: any, fIdx: number) => {
              const url = typeof f === "string" ? f : f?.url || f?.urlStorage;
              if (url && !seenUrls.has(url)) {
                seenUrls.add(url);
                list.push({
                  id: `danio-${order.id}-${fIdx}`,
                  url,
                  tipo: "FOTO",
                  categoria: "PERITAJE",
                  categoriaLabel: "Peritaje de Daños",
                  titulo: f?.nota || f?.descripcion || `Daño detectado en ingreso`,
                  fecha: order.fechaIngreso,
                  orderId: order.id,
                  numeroOrden: order.numeroOrden,
                });
              }
            });
          }
        } catch {}
      }

      // 4. Fotos en pedidos de repuestos
      if (order.sparePartRequests && Array.isArray(order.sparePartRequests)) {
        order.sparePartRequests.forEach((req: any) => {
          if (req.fotoUrl && !seenUrls.has(req.fotoUrl)) {
            seenUrls.add(req.fotoUrl);
            list.push({
              id: `sp-${req.id}`,
              url: req.fotoUrl,
              tipo: "FOTO",
              categoria: "REPUESTO",
              categoriaLabel: "Repuesto Solicitado",
              titulo: req.fallaReparar ? `Repuesto: ${req.fallaReparar}` : "Repuesto requerido",
              descripcion: req.repuestosLista ? `Lista: ${req.repuestosLista}` : undefined,
              fecha: req.createdAt || order.fechaIngreso,
              orderId: order.id,
              numeroOrden: order.workOrder?.numeroOrden || order.numeroOrden,
            });
          }

          if (req.fotos) {
            try {
              const parsed = typeof req.fotos === "string" ? JSON.parse(req.fotos) : req.fotos;
              if (Array.isArray(parsed)) {
                parsed.forEach((pf: any, pfIdx: number) => {
                  const url = typeof pf === "string" ? pf : pf?.url;
                  if (url && !seenUrls.has(url)) {
                    seenUrls.add(url);
                    list.push({
                      id: `sp-list-${req.id}-${pfIdx}`,
                      url,
                      tipo: "FOTO",
                      categoria: "REPUESTO",
                      categoriaLabel: "Repuesto Solicitado",
                      titulo: pf?.nota || req.fallaReparar || "Repuesto",
                      fecha: req.createdAt || order.fechaIngreso,
                      orderId: order.id,
                      numeroOrden: order.workOrder?.numeroOrden || order.numeroOrden,
                    });
                  }
                });
              }
            } catch {}
          }
        });
      }
    });

    return list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [vehicle]);

  // Filtrado de fotos por categoría
  const filteredPhotos = useMemo(() => {
    return allVehiclePhotos.filter((p) => {
      if (filterCategory !== "TODAS" && p.categoria !== filterCategory) {
        return false;
      }
      return true;
    });
  }, [allVehiclePhotos, filterCategory]);

  // Navegación por teclado en el Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === "Escape") {
        setSelectedPhotoIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex((prev) =>
          prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1
        );
      } else if (e.key === "ArrowRight") {
        setSelectedPhotoIndex((prev) =>
          prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, filteredPhotos.length]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900">Vehículo no encontrado</h2>
        <Link href="/app/vehiculos" className="text-xs text-sky-600 hover:underline mt-2 inline-block">
          Volver al parque automotor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Botón Volver y Barra de Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Link
            href="/app/vehiculos"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0 mt-0.5 sm:mt-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                Ficha Técnica e Historial del Vehículo
              </span>
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                {vehicle.patente}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 break-words mt-0.5">
              {vehicle.marca} {vehicle.modelo} ({vehicle.anio})
            </h1>
          </div>
        </div>

        {/* Botones Principales de Recepción */}
        {!activeOrder && (
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <button
              onClick={openNewOrderModal}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Abrir Orden de Trabajo / Peritaje</span>
            </button>
          </div>
        )}
      </div>

      {/* Alerta de Vehículo Activo en Taller */}
      {activeOrder && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-800 text-sm">
                Vehículo actualmente en servicio en el taller
              </p>
              <p className="text-amber-900/90 mt-0.5 text-xs leading-relaxed">
                Este vehículo cuenta con la <strong>Orden activa #{activeOrder.numeroOrden}</strong> (Estado: <strong>{activeOrder.estado}</strong>). Según las reglas del taller, un vehículo no puede tener dos órdenes simultáneas en reparación.
              </p>
            </div>
          </div>
          <Link
            href={`/app/ordenes/${activeOrder.id}`}
            className="w-full sm:w-auto text-center px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-xs whitespace-nowrap shrink-0 transition-colors"
          >
            Ver Orden #{activeOrder.numeroOrden} →
          </Link>
        </div>
      )}

      {/* Alerta de Acción Exitosa */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tarjetas de Ficha Técnica, Titular e Historial en Columna */}
      <div className="grid grid-cols-1 gap-4">
        {/* Datos Técnicos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Datos Técnicos del Vehículo
          </span>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-100/80 gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap">Marca y Modelo:</span>
              <span className="text-slate-900 font-semibold text-right">{vehicle.marca} {vehicle.modelo}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100/80 gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap">Año de Fabricación:</span>
              <span className="text-slate-900 font-semibold text-right">{vehicle.anio || "S/D"}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-100/80 gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap">Color:</span>
              <span className="text-slate-900 font-semibold text-right">{vehicle.color || "No especificado"}</span>
            </div>
            <div className="flex items-center justify-between py-1 gap-2">
              <span className="font-bold text-slate-700 whitespace-nowrap">Nº Bastidor (VIN):</span>
              <span className="font-mono font-bold text-slate-900 text-right">{vehicle.nroChasis || "No especificado"}</span>
            </div>
          </div>
        </div>

        {/* Titular Asignado */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Titular Registrado
          </span>
          <Link
            href={`/app/clientes/${vehicle.client?.id}`}
            className="text-base font-bold text-slate-900 hover:text-sky-600 block transition-colors truncate"
          >
            {vehicle.client?.nombre} {vehicle.client?.apellido}
          </Link>
          <div className="space-y-1 text-xs text-slate-600">
            <p className="font-mono text-[11px]">DNI: {vehicle.client?.dni}</p>
            {vehicle.client?.telefono && (
              <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{vehicle.client.telefono}</span>
              </p>
            )}
          </div>
        </div>

        {/* Estadísticas de Taller */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Historial de Reparaciones
          </span>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xl sm:text-2xl font-black text-slate-900 whitespace-nowrap">
              {clinicalStats?.totalServicios || 0} {clinicalStats?.totalServicios === 1 ? "ingreso" : "ingresos"}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("galeria")}
              className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{allVehiclePhotos.length} {allVehiclePhotos.length === 1 ? "foto" : "fotos"}</span>
            </button>
          </div>
          <span className="text-xs text-slate-500 block pt-0.5">
            {vehicle.workOrders && vehicle.workOrders.length > 0
              ? `Último ingreso: ${new Date(vehicle.workOrders[0].fechaIngreso).toLocaleDateString("es-AR")}`
              : "Sin intervenciones previas"}
          </span>
        </div>
      </div>

      {/* Selector de Pestañas: Órdenes y Galería */}
      <div className="w-full grid grid-cols-2 gap-1.5 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300/70 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("ordenes")}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "ordenes"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/50"
          }`}
        >
          <History className={`w-4 h-4 transition-colors ${activeTab === "ordenes" ? "text-sky-400" : "text-slate-500"}`} />
          <span>Historial de Órdenes</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
              activeTab === "ordenes"
                ? "bg-sky-400/20 text-sky-300 border border-sky-400/30"
                : "bg-slate-300 text-slate-700"
            }`}
          >
            {vehicle.workOrders?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("galeria")}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === "galeria"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-300/50"
          }`}
        >
          <Camera className={`w-4 h-4 transition-colors ${activeTab === "galeria" ? "text-indigo-400" : "text-slate-500"}`} />
          <span>Galería</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
              activeTab === "galeria"
                ? "bg-indigo-400/20 text-indigo-300 border border-indigo-400/30"
                : "bg-slate-300 text-slate-700"
            }`}
          >
            {allVehiclePhotos.length}
          </span>
        </button>
      </div>

      {/* PESTAÑA 1: HISTORIAL DE ÓRDENES */}
      {activeTab === "ordenes" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Historial de Órdenes de Trabajo ({vehicle.workOrders?.length || 0})
              </h2>
              <p className="text-xs text-slate-500">
                Línea de tiempo de servicios realizados, piezas reemplazadas y peritajes.
              </p>
            </div>
            <button
              onClick={openNewOrderModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3.5 py-2.5 rounded-xl border border-sky-200 cursor-pointer shrink-0 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Nueva Orden</span>
            </button>
          </div>

          {vehicle.workOrders?.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-700">No hay órdenes de trabajo previas para este vehículo</p>
              <p className="text-[11px]">Hacé clic en &quot;Abrir Nueva Orden&quot; para registrar el primer ingreso.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicle.workOrders.map((order: any) => {
                let hasSig = false;
                if (order.checklistDanio) {
                  try {
                    const parsed =
                      typeof order.checklistDanio === "string"
                        ? JSON.parse(order.checklistDanio)
                        : order.checklistDanio;
                    hasSig = Boolean(parsed?.firmaCliente);
                  } catch {}
                }

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-slate-300 text-slate-900">
                          Orden #{order.numeroOrden}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                            order.estado === "FINALIZADO" || order.estado === "ENTREGADO"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : order.estado === "EN_CURSO" || order.estado === "EN_REPARACION"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {order.estado.replace(/_/g, " ")}
                        </span>
                        <span className="text-[11px] text-slate-400 sm:ml-auto">
                          {new Date(order.fechaIngreso).toLocaleDateString("es-ES")}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
                        {order.detallesIngreso}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] text-slate-500 pt-0.5">
                        {order.kilometraje && (
                          <span className="flex items-center gap-1 font-mono">
                            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{order.kilometraje.toLocaleString("es-ES")} km</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Fuel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Combustible: {order.nivelNafta}</span>
                        </span>
                        {order.mechanic && (
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Mecánico: {order.mechanic.nombre} {order.mechanic.apellido || ""}</span>
                          </span>
                        )}
                        {hasSig && (
                          <span className="flex items-center gap-1 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Firma cliente</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 flex sm:flex-col justify-end shrink-0">
                      <Link
                        href={`/app/ordenes/${order.id}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-200/70 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs transition-colors"
                      >
                        <span>Ver orden</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: GALERÍA DE FOTOS */}
      {activeTab === "galeria" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-5 animate-in fade-in">
          {/* Header de la Galería */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0 mt-0.5 sm:mt-0">
                <Camera className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Galería Integral del Vehículo ({allVehiclePhotos.length})
                  </h2>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    Mostrando {filteredPhotos.length} de {allVehiclePhotos.length}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                  Todas las fotografías de peritajes de ingreso, arreglos mecánicos y repuestos asociados a la patente {vehicle.patente}.
                </p>
              </div>
            </div>
          </div>

          {/* Barra de Filtros por Categoría */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200/90">
            {[
              { id: "TODAS", label: "Todas las fotos" },
              { id: "ARREGLO", label: "🔧 Arreglos y Bitácora" },
              { id: "PERITAJE", label: "📋 Peritajes e Ingreso" },
              { id: "REPUESTO", label: "📦 Repuestos" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterCategory === cat.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white hover:bg-slate-200/70 text-slate-700 border border-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid de Fotografías */}
          {filteredPhotos.length === 0 ? (
            <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Camera className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">
                {allVehiclePhotos.length === 0
                  ? "Aún no se han cargado fotografías para este vehículo"
                  : "No hay fotografías que coincidan con los filtros seleccionados"}
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                {allVehiclePhotos.length === 0
                  ? "Las fotos tomadas durante el peritaje de ingreso, los arreglos técnicos en la bitácora de trabajo o solicitudes de repuestos aparecerán aquí automáticamente."
                  : "Probá cambiando la categoría o la orden seleccionada para visualizar otras fotos del vehículo."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filteredPhotos.map((photo, pIdx) => {
                const isVideo = photo.tipo === "VIDEO";

                return (
                  <div
                    key={photo.id || pIdx}
                    onClick={() => setSelectedPhotoIndex(pIdx)}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col aspect-square"
                  >
                    {/* Imagen o Video */}
                    {isVideo ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                        <video
                          src={photo.url}
                          preload="metadata"
                          className="w-full h-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={photo.url}
                        alt={photo.titulo || "Foto de vehículo"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-95 group-hover:opacity-100"
                        loading="lazy"
                      />
                    )}

                    {/* Badge Superior: Categoría y Orden */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs backdrop-blur-md ${
                          photo.categoria === "ARREGLO"
                            ? "bg-indigo-600 text-white"
                            : photo.categoria === "PERITAJE"
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {photo.categoriaLabel}
                      </span>
                      {photo.numeroOrden && (
                        <span className="font-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                          #{photo.numeroOrden}
                        </span>
                      )}
                    </div>

                    {/* Overlay Inferior con Descripción y Fecha */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent text-white pointer-events-none">
                      <p className="text-[11px] font-bold line-clamp-1 text-slate-100">
                        {photo.titulo}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-300 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(photo.fecha).toLocaleDateString("es-AR")}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity font-bold text-amber-300 flex items-center gap-0.5">
                          <Maximize2 className="w-2.5 h-2.5" />
                          <span>Ver</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL LIGHTBOX / VISOR EN PANTALLA COMPLETA */}
      {selectedPhotoIndex !== null && filteredPhotos[selectedPhotoIndex] && (
        <ModalPortal>
          <div
            onClick={() => setSelectedPhotoIndex(null)}
            className="fixed inset-0 w-screen h-screen z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 animate-in fade-in select-none"
          >
          {(() => {
            const current = filteredPhotos[selectedPhotoIndex];
            const isVideo = current.tipo === "VIDEO";

            return (
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-5xl w-full max-h-[95vh] bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col"
              >
                {/* Header del Lightbox */}
                <div className="p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3 text-white text-xs px-4 sm:px-6">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        current.categoria === "ARREGLO"
                          ? "bg-indigo-600 text-white"
                          : current.categoria === "PERITAJE"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {current.categoriaLabel}
                    </span>
                    {current.numeroOrden && (
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded bg-white/10 text-amber-300">
                        Orden #{current.numeroOrden}
                      </span>
                    )}
                    <span className="text-slate-400 text-xs hidden sm:inline">
                      • Foto {selectedPhotoIndex + 1} de {filteredPhotos.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                      title="Abrir imagen original en nueva pestaña"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoIndex(null)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                      title="Cerrar visor"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contenedor Principal de la Imagen con Flechas de Navegación */}
                <div className="relative flex-1 flex items-center justify-center p-2 sm:p-4 bg-slate-950 min-h-[300px] max-h-[70vh] overflow-hidden">
                  {/* Flecha Izquierda (Anterior) */}
                  {filteredPhotos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPhotoIndex(
                          selectedPhotoIndex > 0
                            ? selectedPhotoIndex - 1
                            : filteredPhotos.length - 1
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-white flex items-center justify-center shadow-xl backdrop-blur-xs transition-all cursor-pointer z-10 active:scale-95"
                      title="Foto anterior (Flecha Izquierda)"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}

                  {/* Imagen o Video */}
                  {isVideo ? (
                    <video
                      src={current.url}
                      controls
                      autoPlay
                      className="max-h-[68vh] w-auto max-w-full rounded-2xl shadow-2xl"
                    />
                  ) : (
                    <img
                      src={current.url}
                      alt={current.titulo || "Foto de vehículo"}
                      className="max-h-[68vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl"
                    />
                  )}

                  {/* Flecha Derecha (Siguiente) */}
                  {filteredPhotos.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPhotoIndex(
                          selectedPhotoIndex < filteredPhotos.length - 1
                            ? selectedPhotoIndex + 1
                            : 0
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-white flex items-center justify-center shadow-xl backdrop-blur-xs transition-all cursor-pointer z-10 active:scale-95"
                      title="Foto siguiente (Flecha Derecha)"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </div>

                {/* Footer Informativo del Lightbox */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs px-6">
                  <div>
                    <p className="font-extrabold text-sm text-slate-100">
                      {current.titulo}
                    </p>
                    {current.descripcion && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {current.descripcion}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono block mt-1">
                      Registrado el {new Date(current.fecha).toLocaleString("es-AR")}
                    </span>
                  </div>

                  {current.orderId && (
                    <Link
                      href={`/app/ordenes/${current.orderId}`}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-colors shrink-0"
                    >
                      <span>Ver Orden #{current.numeroOrden}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
        </ModalPortal>
      )}

    </div>
  );
}
