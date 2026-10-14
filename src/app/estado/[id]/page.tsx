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
  ShieldCheck,
  AlertCircle,
  MapPin,
  Fuel,
  Camera,
} from "lucide-react";

export default function EstadoOrdenClientePage() {
  const { id } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Orden no encontrada o identificador inválido");
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-400">
          Cargando seguimiento de tu vehículo...
        </p>
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white space-y-4 shadow-2xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold">Orden no encontrada</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || "El número o identificador de orden ingresado no corresponde a ningún vehículo registrado."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
            >
              Volver a la Página Principal
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { order, settings } = data;
  const { vehicle } = order;
  const client = vehicle.client;

  // Normalizar estado para el stepper
  const estado = order.estado;
  const isFinalizado = estado === "FINALIZADO" || estado === "REPARADO" || estado === "TERMINADO";
  const isEsperandoRepuestos = estado === "ESPERANDO_REPUESTOS" || estado === "EN_ESPERA_REPUESTOS";
  const isEnReparacion = estado === "EN_CURSO" || estado === "EN_REPARACION";
  const isPendiente = estado === "PENDIENTE" || estado === "PENDIENTE_PERITAJE";

  // Calcular índice de paso activo (1 a 4)
  let activeStep = 1;
  if (isFinalizado) activeStep = 4;
  else if (isEsperandoRepuestos) activeStep = 3;
  else if (isEnReparacion) activeStep = 2;
  else activeStep = 1;

  // Teléfono de WhatsApp limpio para link
  const cleanPhone = (settings?.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "");
  const whatsappConsultMsg = encodeURIComponent(
    `Hola ${settings?.tallerNombre}, soy ${client.nombre} ${client.apellido}. Quería consultar sobre el avance de mi ${vehicle.marca} ${vehicle.modelo} (${vehicle.patente}) en la Orden #${order.numeroOrden}.`
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Bar Institucional */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-white tracking-tight block">
                {settings?.tallerNombre || "Taller Central Pro"}
              </span>
              <span className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider block">
                Portal de Seguimiento para Clientes
              </span>
            </div>
          </div>

          <a
            href={`https://wa.me/${cleanPhone}?text=${whatsappConsultMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shadow-sm transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Consultar por WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Banner de Estado Principal */}
        <div
          className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden ${
            isFinalizado
              ? "bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/40"
              : isEsperandoRepuestos
              ? "bg-gradient-to-br from-amber-950/70 via-slate-900 to-slate-900 border-amber-500/40"
              : "bg-gradient-to-br from-sky-950/80 via-slate-900 to-slate-900 border-sky-500/40"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white uppercase tracking-wider">
                  Orden #{order.numeroOrden}
                </span>
                <span className="text-xs text-slate-400">
                  Ingreso: {new Date(order.fechaIngreso).toLocaleDateString("es-AR")}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {isFinalizado
                  ? "¡Vehículo Listo para Retirar!"
                  : isEsperandoRepuestos
                  ? "En Espera de Repuestos"
                  : isEnReparacion
                  ? "Vehículo en Reparación"
                  : "Ingresado / En Peritaje"}
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {isFinalizado
                  ? `Las reparaciones de tu ${vehicle.marca} ${vehicle.modelo} han concluido satisfactoriamente. Ha superado las pruebas de control de calidad y ya podés pasar por el taller a retirarlo.`
                  : isEsperandoRepuestos
                  ? "El diagnóstico ha finalizado y el taller se encuentra a la espera de la entrega de repuestos e insumos por parte de los proveedores oficiales."
                  : isEnReparacion
                  ? `Nuestros mecánicos especialistas están trabajando actualmente en la reparación de tu ${vehicle.marca} ${vehicle.modelo}.`
                  : "Tu vehículo ha ingresado a las instalaciones del taller y se encuentra en etapa de inspección visual y constatación técnica."}
              </p>
            </div>

            <div className="shrink-0">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-xs border ${
                  isFinalizado
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : isEsperandoRepuestos
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-ping" />
                <span>{order.estado.replace(/_/g, " ")}</span>
              </span>
            </div>
          </div>

          {/* Stepper Visual de 4 Fases */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { step: 1, label: "Recepción y Peritaje", desc: "Check-in inicial" },
                { step: 2, label: "Diagnóstico y Taller", desc: "Mecánicos activos" },
                { step: 3, label: "Repuestos y Pruebas", desc: "Control de calidad" },
                { step: 4, label: "Listo para Retirar", desc: "Entrega al cliente" },
              ].map((item) => {
                const isPassed = activeStep > item.step;
                const isCurrent = activeStep === item.step;

                return (
                  <div key={item.step} className="space-y-2">
                    <div className="flex items-center justify-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          isPassed || isCurrent
                            ? isFinalizado
                              ? "bg-emerald-500 text-slate-950 font-black ring-4 ring-emerald-500/20"
                              : "bg-sky-500 text-slate-950 font-black ring-4 ring-sky-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                        }`}
                      >
                        {isPassed || (isCurrent && isFinalizado) ? "✓" : item.step}
                      </div>
                    </div>
                    <div>
                      <p
                        className={`font-bold text-[11px] sm:text-xs truncate ${
                          isCurrent
                            ? "text-white"
                            : isPassed
                            ? "text-slate-300"
                            : "text-slate-600"
                        }`}
                      >
                        {item.label}
                      </p>
                      <span className="hidden sm:block text-[10px] text-slate-500 truncate">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Datos del Vehículo y Cliente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ficha del Auto */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-sky-400">
              <Car className="w-4 h-4" />
              <span className="uppercase tracking-wider">Vehículo Registrado</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-xl font-black text-white">
                {vehicle.marca} {vehicle.modelo}
              </p>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="font-mono font-extrabold bg-white text-slate-950 px-2 py-0.5 rounded-md">
                  {vehicle.patente}
                </span>
                <span className="text-slate-400">Año {vehicle.anio}</span>
                {vehicle.color && <span className="text-slate-400">• Color: {vehicle.color}</span>}
              </div>

              {order.kilometraje && (
                <p className="text-xs text-slate-400 pt-1">
                  Kilometraje verificado al ingreso: <strong>{order.kilometraje.toLocaleString("es-AR")} km</strong>
                </p>
              )}

              {order.nivelNafta && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-1">
                  <Fuel className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nivel de combustible registrado: <strong>{order.nivelNafta}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Ficha del Propietario / Cliente */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-sky-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="uppercase tracking-wider">Titular y Garantía</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Titular del Vehículo:</span>
                <p className="text-sm font-bold text-white">
                  {client.nombre} {client.apellido}
                </p>
              </div>

              <div>
                <span className="text-slate-500 text-[11px] block">Motivo de Recepción / Falla:</span>
                <p className="text-slate-300 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 leading-relaxed text-[11px]">
                  {order.detallesIngreso}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-semibold pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Garantía escrita de 3 meses en mano de obra técnica</span>
              </div>
            </div>
          </div>
        </div>


        {/* Evidencia Fotográfica y Peritaje (si hay fotos cargadas) */}
        {order.multimedia && order.multimedia.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-slate-400">
              <Camera className="w-4 h-4 text-sky-400" />
              <span className="uppercase tracking-wider">Evidencias Fotográficas de Peritaje ({order.multimedia.length})</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {order.multimedia.map((item: any) => (
                <div key={item.id} className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-slate-950 group shadow-sm">
                  <img
                    src={item.urlStorage}
                    alt={item.descripcion || "Foto de peritaje"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2 text-[10px] text-white">
                    <span className="font-bold uppercase tracking-wider">{item.etiqueta || "PERITAJE"}</span>
                    {item.descripcion && <span className="text-slate-300 truncate">{item.descripcion}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contacto y Ubicación del Taller */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-bold text-white text-sm">
              {settings?.tallerNombre || "Taller Central Pro"}
            </p>
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{settings?.direccion || "Av. del Libertador 4580, Buenos Aires"}</span>
            </p>
            <p className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{settings?.horarios || "Lunes a Viernes: 08:00 a 19:00 hs"}</span>
            </p>
          </div>

          <a
            href={`https://wa.me/${cleanPhone}?text=${whatsappConsultMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-extrabold text-xs shadow-lg transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Hablar con el Taller</span>
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>© {new Date().getFullYear()} {settings?.tallerNombre || "Taller Central Pro"} • Plataforma de Diagnóstico y Seguimiento Digital</p>
      </footer>
    </div>
  );
}
