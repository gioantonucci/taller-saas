"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Wrench,
  Car,
  CheckCircle2,
  Clock,
  MessageCircle,
  AlertCircle,
  MapPin,
  Fuel,
  Camera,
  Search,
  ArrowLeft,
  Calendar,
  Gauge,
  Phone,
  Check,
  User,
  ExternalLink,
  Video,
  Play,
  X,
} from "lucide-react";
import Footer from "@/components/Footer";

export default function EstadoOrdenClientePage() {
  const { id } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMedia, setActiveMedia] = useState<{ url: string; tipo: string; descripcion?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/public/orders/${encodeURIComponent(String(id))}`)
      .then((res) => {
        if (!res.ok) throw new Error("Orden no encontrada o identificador no válido.");
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err) => {
        setError(err.message || "Error al cargar el estado de la orden");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070708] flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-3 border-[#e5242b] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono uppercase tracking-wider text-neutral-400">
          Consultando estado del vehículo en taller...
        </p>
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="min-h-screen bg-[#070708] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center text-white space-y-5 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#e5242b]/15 text-[#e5242b] flex items-center justify-center border border-[#e5242b]/30">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black uppercase tracking-tight">Orden no encontrada</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {error || "El número de orden o matrícula ingresada no coincide con ningún registro activo en el taller."}
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/estado"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors"
            >
              <Search className="w-3.5 h-3.5 mr-1.5" />
              <span>Buscar otra matrícula</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#e5242b] hover:bg-[#c91d23] text-xs font-bold text-white transition-colors"
            >
              <span>Ir al Inicio</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { order, settings } = data;
  const { vehicle } = order;
  const client = vehicle?.client || {};

  // Normalización exhaustiva del estado
  const rawEstado = (order.estado || "").toUpperCase().trim();

  const isEntregado = rawEstado === "ENTREGADO" || rawEstado === "ARCHIVADO";
  const isFinalizado =
    isEntregado ||
    rawEstado === "FINALIZADO" ||
    rawEstado === "REPARADO" ||
    rawEstado === "TERMINADO" ||
    rawEstado === "LISTO";
  const isEsperandoRepuestos =
    rawEstado === "ESPERANDO_REPUESTOS" ||
    rawEstado === "EN_ESPERA_REPUESTOS" ||
    rawEstado === "REPUESTOS";
  const isEnReparacion =
    rawEstado === "EN_CURSO" ||
    rawEstado === "EN_REPARACION" ||
    rawEstado === "EN_PROCESO" ||
    rawEstado === "DIAGNOSTICO";
  const isPendiente = !isFinalizado && !isEsperandoRepuestos && !isEnReparacion;

  // Índice de paso activo (1 a 4)
  let activeStep = 1;
  let statusBadgeLabel = "EN PERITAJE";
  let statusBadgeStyle = "bg-neutral-800 text-neutral-300 border-neutral-700";
  let headerTitle = "Ingresado / En Peritaje";
  let headerDescription =
    "Tu vehículo ha ingresado a las instalaciones del taller y se encuentra en etapa de inspección visual y constatación técnica.";

  if (isEntregado) {
    activeStep = 4;
    statusBadgeLabel = "ENTREGADO";
    statusBadgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    headerTitle = "Vehículo Entregado al Cliente";
    headerDescription =
      "El vehículo ha sido entregado a su titular tras completar satisfactoriamente todos los trabajos técnicos y revisiones en taller.";
  } else if (isFinalizado) {
    activeStep = 4;
    statusBadgeLabel = "LISTO PARA RETIRAR";
    statusBadgeStyle = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    headerTitle = "¡Vehículo Listo para Retirar!";
    headerDescription = `Las tareas en tu ${vehicle?.marca || "vehículo"} ${vehicle?.modelo || ""} han concluido satisfactoriamente. Ha superado el control de calidad y ya puedes pasar por el taller a retirarlo.`;
  } else if (isEsperandoRepuestos) {
    activeStep = 3;
    statusBadgeLabel = "EN ESPERA DE REPUESTOS";
    statusBadgeStyle = "bg-amber-500/15 text-amber-400 border-amber-500/30";
    headerTitle = "En Espera de Repuestos y Pruebas";
    headerDescription =
      "El diagnóstico ha concluido y el taller se encuentra coordinando la recepción de repuestos específicos para continuar con las pruebas de ensamblaje.";
  } else if (isEnReparacion) {
    activeStep = 2;
    statusBadgeLabel = "EN REPARACIÓN";
    statusBadgeStyle = "bg-[#e5242b]/15 text-[#e5242b] border-[#e5242b]/30";
    headerTitle = "Vehículo en Reparación";
    headerDescription = `Nuestros mecánicos especialistas están trabajando actualmente en la reparación técnica de tu ${vehicle?.marca || "vehículo"} ${vehicle?.modelo || ""}.`;
  } else {
    activeStep = 1;
    statusBadgeLabel = rawEstado.replace(/_/g, " ") || "INGRESADO";
    statusBadgeStyle = "bg-neutral-800 text-neutral-300 border-neutral-700";
    headerTitle = "Ingresado / En Peritaje";
    headerDescription =
      "Tu vehículo ha ingresado a las instalaciones del taller y se encuentra en etapa de inspección visual y constatación técnica.";
  }

  // Teléfono de WhatsApp limpio para enlace directo
  const phone = settings?.whatsapp || "+34 656 40 62 86";
  const cleanPhone = phone.replace(/\D/g, "");
  const whatsappConsultMsg = encodeURIComponent(
    `Hola POGGI Taller Integral, soy ${client?.nombre || "cliente"}. Quisiera consultar sobre el avance de mi ${vehicle?.marca || ""} ${vehicle?.modelo || ""} (${vehicle?.patente || ""}) en la Orden #${order.numeroOrden}.`
  );

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-neutral-100 flex flex-col font-sans selection:bg-[#e5242b] selection:text-white antialiased">
      {/* Top Bar Institucional Poggi */}
      <header className="border-b border-neutral-800/80 bg-[#09090b]/95 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/images/poggi/logo.png"
                alt="Logo POGGI Taller Integral"
                className="h-8 sm:h-9 w-auto object-contain drop-shadow"
              />
              <span className="text-base sm:text-lg font-black tracking-wider uppercase text-[#e5242b]">
                POGGI
              </span>
            </Link>
            <span className="hidden sm:inline-block text-neutral-600">|</span>
            <span className="hidden sm:inline-block text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
              Seguimiento de Vehículo
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/estado"
              className="text-xs font-bold text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nueva consulta</span>
            </Link>

            <a
              href={`https://wa.me/${cleanPhone}?text=${whatsappConsultMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Banner de Estado Principal */}
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/80 border border-neutral-800 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          {/* Luz sutil de fondo */}
          <div
            className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
              isFinalizado
                ? "bg-emerald-500"
                : isEsperandoRepuestos
                ? "bg-amber-500"
                : "bg-[#e5242b]"
            }`}
          />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[11px] font-mono font-black px-2.5 py-1 rounded-md bg-neutral-950 border border-neutral-800 text-white uppercase tracking-wider">
                  ORDEN #{order.numeroOrden}
                </span>
                {order.fechaIngreso && (
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#e5242b]" />
                    <span>Ingreso: {formatDate(order.fechaIngreso)}</span>
                  </span>
                )}
                {isEntregado && order.fechaEntrega && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Entregado: {formatDate(order.fechaEntrega)}</span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
                {headerTitle}
              </h1>

              <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed font-normal">
                {headerDescription}
              </p>
            </div>

            {/* Badge de Estado */}
            <div className="shrink-0 self-start sm:self-center">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider border ${statusBadgeStyle}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span>{statusBadgeLabel}</span>
              </span>
            </div>
          </div>

          {/* Stepper Visual de 4 Fases Oficiales */}
          <div className="mt-10 pt-8 border-t border-neutral-800/80 relative z-10">
            <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
              {[
                { step: 1, label: "Recepción y Peritaje", desc: "Check-in inicial" },
                { step: 2, label: "Diagnóstico y Taller", desc: "Mecánicos activos" },
                { step: 3, label: "Repuestos y Pruebas", desc: "Control de calidad" },
                { step: 4, label: isEntregado ? "Entregado" : "Listo para Retirar", desc: isEntregado ? "Coche entregado" : "Retiro en taller" },
              ].map((item) => {
                const isPassed = activeStep > item.step;
                const isCurrent = activeStep === item.step;
                const isStepCompleted = isPassed || (isCurrent && isFinalizado);

                return (
                  <div key={item.step} className="space-y-2">
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                          isStepCompleted
                            ? "bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20"
                            : isCurrent
                            ? "bg-[#e5242b] text-white shadow-lg shadow-[#e5242b]/25 ring-4 ring-[#e5242b]/20"
                            : "bg-neutral-950 text-neutral-600 border border-neutral-800"
                        }`}
                      >
                        {isStepCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : item.step}
                      </div>
                    </div>
                    <div>
                      <p
                        className={`font-black uppercase text-[10px] sm:text-xs tracking-wide truncate ${
                          isCurrent
                            ? "text-white"
                            : isStepCompleted
                            ? "text-neutral-300"
                            : "text-neutral-600"
                        }`}
                      >
                        {item.label}
                      </p>
                      <span className="hidden sm:block text-[10px] text-neutral-500 truncate mt-0.5">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fichas Técnicas del Vehículo y Recepción */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Ficha 1: Vehículo Registrado */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#e5242b]">
                <Car className="w-4 h-4" />
                <span>Vehículo Registrado</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">Ficha técnica</span>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                  {vehicle?.marca} {vehicle?.modelo}
                </h3>
                <div className="flex items-center gap-2 flex-wrap text-xs mt-2">
                  <span className="font-mono font-black bg-white text-black px-2.5 py-0.5 rounded text-xs tracking-wider shadow-sm">
                    {vehicle?.patente}
                  </span>
                  {vehicle?.anio && (
                    <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-mono text-xs">
                      Año {vehicle.anio}
                    </span>
                  )}
                  {vehicle?.color && (
                    <span className="text-neutral-400 text-xs">
                      • Color: {vehicle.color}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800/80 space-y-2 text-xs text-neutral-400">
                {order.kilometraje && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Gauge className="w-3.5 h-3.5 text-[#e5242b]" />
                      <span>Kilometraje registrado:</span>
                    </span>
                    <strong className="text-neutral-200 font-mono">
                      {order.kilometraje.toLocaleString("es-ES")} km
                    </strong>
                  </div>
                )}

                {order.nivelNafta && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <Fuel className="w-3.5 h-3.5 text-amber-500" />
                      <span>Nivel de combustible:</span>
                    </span>
                    <strong className="text-neutral-200 font-mono uppercase">
                      {order.nivelNafta}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ficha 2: Titular y Recepción (SIN mención de garantía) */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#e5242b]">
                <User className="w-4 h-4" />
                <span>Titular y Recepción</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">Recepción oficial</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Titular del Vehículo
                </span>
                <p className="text-base font-bold text-white">
                  {client?.nombre} {client?.apellido || ""}
                </p>
              </div>

              <div>
                <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-wider block mb-1">
                  Motivo de Recepción / Falla reportada
                </span>
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 text-neutral-300 leading-relaxed text-xs">
                  {order.detallesIngreso || "Revisión técnica de taller y mantenimiento programado."}
                </div>
              </div>

              {order.fechaEstimada && !isEntregado && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 text-neutral-400">
                  <span className="text-[11px]">Fecha estimada de finalización:</span>
                  <strong className="text-neutral-200 font-mono">
                    {formatDate(order.fechaEstimada)}
                  </strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evidencia Fotográfica de Peritaje (si hay fotos cargadas) */}
        {order.multimedia && order.multimedia.length > 0 && (
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#e5242b]">
                <Camera className="w-4 h-4" />
                <span>Evidencias Multimedia de Peritaje ({order.multimedia.length})</span>
              </div>
              <span className="text-[10px] font-mono text-neutral-500">Inspección digital</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {order.multimedia.map((item: any) => {
                const isVid =
                  item.tipo === "VIDEO" ||
                  /\.(mp4|webm|mov|m4v|avi|3gp|3gpp|mkv)$/i.test(item.urlStorage || "");
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveMedia({ url: item.urlStorage, tipo: isVid ? "VIDEO" : "FOTO", descripcion: item.descripcion })}
                    className="relative rounded-2xl overflow-hidden border border-neutral-800 aspect-video bg-neutral-950 group shadow-md cursor-pointer hover:border-neutral-700 transition-all"
                  >
                    {isVid ? (
                      <div className="w-full h-full relative flex items-center justify-center bg-black">
                        <video
                          src={item.urlStorage}
                          preload="metadata"
                          className="w-full h-full object-cover opacity-75"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#e5242b] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.urlStorage}
                        alt={item.descripcion || "Foto de peritaje"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5 text-[10px] text-white">
                      <span className="font-black uppercase tracking-wider text-[#e5242b] flex items-center gap-1">
                        {isVid ? <Video className="w-2.5 h-2.5" /> : null}
                        <span>{item.etiqueta || (isVid ? "VIDEO" : "PERITAJE")}</span>
                      </span>
                      {item.descripcion && (
                        <span className="text-neutral-300 truncate mt-0.5">
                          {item.descripcion}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal de visualización de evidencia para el cliente */}
        {activeMedia && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setActiveMedia(null)}
          >
            <div
              className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              {activeMedia.tipo === "VIDEO" || /\.(mp4|webm|mov|m4v|avi|3gp|3gpp|mkv)$/i.test(activeMedia.url) ? (
                <video
                  src={activeMedia.url}
                  controls
                  autoPlay
                  playsInline
                  className="rounded-2xl max-w-full max-h-[80vh] shadow-2xl bg-black"
                />
              ) : (
                <img
                  src={activeMedia.url}
                  alt="Evidencia Full"
                  className="rounded-2xl max-w-full max-h-[80vh] object-contain shadow-2xl"
                />
              )}
              {activeMedia.descripcion && (
                <p className="text-xs text-neutral-300 font-medium text-center">
                  {activeMedia.descripcion}
                </p>
              )}
              <button
                type="button"
                onClick={() => setActiveMedia(null)}
                className="mt-1 px-6 py-2 rounded-full bg-white text-neutral-900 font-bold text-xs shadow-xl hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Cerrar Vista</span>
              </button>
            </div>
          </div>
        )}

        {/* Ficha de Ubicación y Contacto Directo con el Taller */}
        <div className="p-6 rounded-3xl bg-neutral-900/80 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1.5 text-xs text-neutral-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#e5242b] block">
              POGGI TALLER INTEGRAL
            </span>
            <p className="font-bold text-white text-base">
              Atención directa en València
            </p>
            <p className="flex items-center gap-1.5 text-neutral-300">
              <MapPin className="w-3.5 h-3.5 text-[#e5242b] shrink-0" />
              <span>{settings?.direccion || "C. de Sant Pius X, 13, 46017 València, España"}</span>
            </p>
            <p className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-[#e5242b] shrink-0" />
              <span>{settings?.horarios || "Lunes a viernes · 08:00–18:00"}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`tel:${phone}`}
              className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Phone className="w-3.5 h-3.5 text-[#e5242b]" />
              <span>Llamar</span>
            </a>

            <a
              href={`https://wa.me/${cleanPhone}?text=${whatsappConsultMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#25D366]/20 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white" />
              <span>Consultar por WhatsApp</span>
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
