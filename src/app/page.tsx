"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import {
  Wrench,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  Car,
  ChevronRight,
  MapPin,
  Phone,
  Sparkles,
  ArrowRight,
  Cpu,
  Search,
  Check,
  Layers,
  Award,
} from "lucide-react";

export default function WorkshopLandingPage() {
  const { settings } = useTenantSettings();
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");

  const cleanPhone = (settings.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "");
  const workshopName = settings.tallerNombre || "Taller Mecánico Central Pro";
  const address = settings.direccion || "Av. del Libertador 4580, Buenos Aires";
  const hours = settings.horarios || "Lunes a Viernes: 08:00 a 19:00 hs | Sábados: 08:30 a 13:00 hs";

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingCode.trim();
    if (clean) {
      router.push(`/estado/${clean}`);
    }
  };

  const servicesList = [
    {
      title: "Mantenimiento y Service Programado",
      desc: "Cambio de aceite sintético de alta gama, filtros de aire, aceite, combustible y habitáculo. Chequeo de 30 puntos de seguridad.",
      icon: Clock,
      badge: "Preventivo",
    },
    {
      title: "Inyección y Diagnóstico Computarizado",
      desc: "Scanners multimarca de última generación. Diagnóstico de fallas electrónicas, reseteo de Check Engine y calibración de sensores.",
      icon: Cpu,
      badge: "Electrónica",
    },
    {
      title: "Frenos, Discos y Seguridad Activa",
      desc: "Revisión completa de frenos ABS, rectificación de discos, cambio de pastillas cerámicas, líquido de freno y campanas traseras.",
      icon: ShieldCheck,
      badge: "Seguridad",
    },
    {
      title: "Distribución y Bomba de Agua",
      desc: "Reemplazo de kits de distribución (correa/cadena y tensores) con instrumental de puesta a punto oficial y bombas de refrigeración.",
      icon: Wrench,
      badge: "Motor",
    },
    {
      title: "Tren Delantero y Suspensión",
      desc: "Amortiguadores presurizados, extremos de dirección, bieletas, bujes, parrillas de suspensión y alineación 3D computarizada.",
      icon: Layers,
      badge: "Chasis",
    },
    {
      title: "Embragues y Transmisión",
      desc: "Diagnóstico y sustitución de embragues convencionales y bimasa, bombines hidráulicos y service de cajas manuales y automáticas.",
      icon: Activity,
      badge: "Transmisión",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION ORIENTADO AL CLIENTE DEL TALLER */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-slate-950 text-white pt-16 pb-24 lg:pt-20 lg:pb-32">
          {/* Fondo sutil y gradientes de luz */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none" />
          <div className="absolute top-1/4 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Columna Izquierda: Propuesta de Valor para el Conductor */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/20 text-sky-400 text-xs font-bold tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>{workshopName} • Servicio Mecánico Profesional</span>
                </div>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-white">
                  Tu auto en las mejores manos.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-300 to-indigo-300">
                    Mecánica de precisión y transparencia total.
                  </span>
                </h1>

                <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed">
                  Realizamos service programado, inyección electrónica, frenos y mecánica general. Constatamos el ingreso de tu vehículo con <strong>peritaje digital de fotos</strong> y te mantenemos informado paso a paso en tiempo real.
                </p>

                {/* Botones de Acción para el Cliente */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `Hola ${workshopName}, quisiera consultar por un turno / presupuesto para mi vehículo.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
                  >
                    <Phone className="w-4 h-4 fill-slate-950" />
                    <span>Pedir Turno por WhatsApp</span>
                  </a>

                  <Link
                    href="/servicios"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700/80 transition-all"
                  >
                    <span>Ver Nuestros Servicios</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </div>

                {/* 4 Sellos de Confianza para el Conductor */}
                <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-slate-800/80 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-medium">Presupuesto Previo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-medium">Garantía Escrita</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-medium">Peritaje con Fotos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-medium">Scanner Oficial</span>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Tarjeta de Seguimiento en Vivo para Clientes */}
              <div className="lg:col-span-5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/60 relative overflow-hidden backdrop-blur">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-400/20">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">
                          Portal de Clientes
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Seguí el avance de tu auto en vivo
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      Online 24/7
                    </span>
                  </div>

                  <form onSubmit={handleTrackingSubmit} className="pt-5 space-y-3">
                    <label className="block text-xs font-semibold text-slate-300">
                      ¿Tenés tu auto en el taller? Ingresá tu Orden o Patente:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej: 1001 o AF 142 XY"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-slate-950 border border-slate-700/80 font-mono text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all uppercase"
                      />
                      <button
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        title="Buscar orden"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Consultá qué tareas se están realizando, evidencias fotográficas de peritaje y fecha estimada de retiro.
                    </p>
                  </form>

                  {/* Preview de ejemplo del peritaje de ingreso */}
                  <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Ejemplo de reporte transparente:
                    </span>
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-white">Toyota Corolla XEI • AF 142 XY</p>
                        <p className="text-[11px] text-slate-400">Check-in completado con 4 fotos de peritaje</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        En Reparación
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* NUESTROS SERVICIOS MECÁNICOS */}
        {/* ========================================================================= */}
        <section id="servicios" className="py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-extrabold uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Especialidades de Taller
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
                Servicios Integrales para tu Vehículo
              </h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Trabajamos con repuestos garantizados, herramientas oficiales y personal capacitado en todas las marcas y modelos nacionales e importados.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesList.map((srv, idx) => {
                const IconComponent = srv.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all">
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {srv.badge}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">
                        {srv.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {srv.desc}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hola ${workshopName}, quisiera consultar sobre el servicio de ${srv.title}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        <span>Consultar presupuesto</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Link
                href="/servicios"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-sm"
              >
                <span>Ver Catálogo Completo de Reparaciones</span>
                <ArrowRight className="w-4 h-4 text-sky-400" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CÓMO TRABAJAMOS: TRANSPARENCIA Y PERITAJE PASO A PASO */}
        {/* ========================================================================= */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                Paso a Paso
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
                ¿Cómo cuidamos tu auto?
              </h2>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                Sin sorpresas en la factura ni cambios de piezas innecesarios. Nuestro protocolo garantiza absoluta tranquilidad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center relative">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 text-white font-black text-sm flex items-center justify-center mb-4">
                  1
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  1. Recepción y Turno
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Traés tu vehículo con turno coordinado. Escuchamos el motivo de visita y registramos kilometraje y combustible.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center relative">
                <div className="w-10 h-10 mx-auto rounded-full bg-sky-600 text-white font-black text-sm flex items-center justify-center mb-4">
                  2
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  2. Peritaje Digital
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fotografiamos detalles estéticos de ingreso, comprobamos luces testigo y escaneamos la computadora del auto.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center relative">
                <div className="w-10 h-10 mx-auto rounded-full bg-indigo-600 text-white font-black text-sm flex items-center justify-center mb-4">
                  3
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  3. Presupuesto Claro
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Te enviamos por WhatsApp el desglose exacto de repuestos y mano de obra. Nada se cambia sin tu visto bueno.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center relative">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-4">
                  4
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                  4. Entrega y Garantía
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Retirás tu vehículo listo, probado y con garantía oficial por escrito de repuestos y mano de obra.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INFORMACIÓN DE CONTACTO, HORARIOS Y UBICACIÓN */}
        {/* ========================================================================= */}
        <section className="py-20 bg-slate-900 text-white border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                    Estamos para ayudarte
                  </span>
                  <h2 className="text-3xl font-extrabold text-white mt-1">
                    Acercate a Nuestro Taller
                  </h2>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">
                  Contamos con taller propio equipado con elevadores hidráulicos, laboratorio de inyección y sala de espera climatizada para clientes.
                </p>

                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                    <MapPin className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm">Dirección</p>
                      <p className="text-slate-300 mt-0.5">{address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm">Horarios de Atención</p>
                      <p className="text-slate-300 mt-0.5">{hours}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                    <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm">WhatsApp y Teléfono</p>
                      <p className="text-slate-300 mt-0.5">
                        {settings.whatsapp || "+54 9 11 4567-8900"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `Hola ${workshopName}, quisiera coordinar una visita a su taller.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                  >
                    <Phone className="w-4 h-4 fill-slate-950" />
                    <span>Iniciar Chat por WhatsApp</span>
                  </a>

                  <Link
                    href="/contacto"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-colors"
                  >
                    <span>Formulario de Contacto</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Tarjeta de Destacados del Taller */}
              <div className="lg:col-span-6">
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-7 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base">
                        Calidad de Servicio Homologada
                      </h3>
                      <p className="text-xs text-slate-400">
                        Compromiso con cada cliente que nos elige
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Repuestos originales y primeras marcas de distribuidora oficial.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Diagnóstico computarizado con reporte impreso o digital.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Guardia de auxilio y recepción con grúa coordinada.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Múltiples medios de pago: Efectivo, Transferencia y Tarjetas.</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-slate-400 font-semibold">¿Necesitás una cotización rápida?</p>
                      <p className="text-xs font-bold text-white mt-0.5">Escribinos con la patente y marca de tu auto</p>
                    </div>
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
                    >
                      Cotizar Ahora
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* BANNER INFERIOR DISCRETO PARA EL STAFF / MECÁNICOS */}
        {/* ========================================================================= */}
        <section className="bg-slate-950 border-t border-slate-800/80 py-4 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <span>¿Sos mecánico o empleado del taller?</span>
            <Link
              href="/login"
              className="font-bold text-sky-400 hover:text-sky-300 underline underline-offset-4"
            >
              Ingresar al Sistema Operativo del Taller →
            </Link>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
