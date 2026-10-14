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
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Cpu,
  Car,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function PoggiLandingPage() {
  const { settings } = useTenantSettings();
  const router = useRouter();
  const [trackingCode, setTrackingCode] = useState("");

  const phone = settings.whatsapp || "+34 656 40 62 86";
  const cleanPhone = phone.replace(/\D/g, "");
  const address = settings.direccion || "C. de Sant Pius X, 13, 46017 València, España";
  const email = settings.email || "poggitallerintegral@gmail.com";
  const hours = settings.horarios || "Lunes a viernes · 08:00–18:00";

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = trackingCode.trim();
    if (clean) {
      router.push(`/estado/${clean}`);
    }
  };

  const services = [
    {
      num: "01",
      title: "Mecánica general",
      desc: "Mantenimiento, revisiones y reparación de averías con repuestos de calidad certificada.",
    },
    {
      num: "02",
      title: "Diagnosis computarizada",
      desc: "Localización precisa y rápida del origen de averías mediante escáner multimarca avanzado.",
    },
    {
      num: "03",
      title: "Electricidad",
      desc: "Sistemas eléctricos y electrónicos del automóvil, alternadores, baterías y arranque.",
    },
    {
      num: "04",
      title: "Neumáticos",
      desc: "Montaje, equilibrado de precisión, alineación y mantenimiento de ruedas.",
    },
    {
      num: "05",
      title: "Climatización",
      desc: "Revisión, carga de gas refrigerante, detección de fugas y reparación del aire acondicionado.",
    },
    {
      num: "06",
      title: "Electrónica automotriz",
      desc: "Diagnosis profunda, calibración de sensores y reparación de sistemas electrónicos y centralitas.",
    },
  ];

  const specializationChecks = [
    "Diagnosis electrónica de alta precisión",
    "Unidades de control (ECU) y sistemas de gestión del motor",
    "Sistemas eléctricos integrales del vehículo",
    "Detección y resolución de averías electrónicas complejas",
    "Reparación, programación y mantenimiento preventivo",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#080808] text-white font-sans selection:bg-[#e5242b] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section
          className="relative min-h-[780px] lg:min-h-[820px] flex items-center justify-center bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(8,8,8,0.96) 0%, rgba(8,8,8,0.85) 45%, rgba(8,8,8,0.3) 100%), url('/images/poggi/motor.jpg')`,
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-20 lg:py-28 relative z-10">
            <div className="max-w-3xl space-y-6">
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase">
                <span className="text-[#e5242b]">Taller de automoción</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-300">Valencia</span>
              </div>

              {/* Título Principal */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[0.98] text-white">
                Más de <span className="text-[#e5242b]">30 años</span> cuidando tu vehículo.
              </h1>

              {/* Descripción */}
              <p className="text-slate-300 text-base sm:text-xl font-normal leading-relaxed max-w-2xl">
                Mantenimiento, diagnóstico, reparación y electrónica automotriz con experiencia, tecnología y atención personalizada.
              </p>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center gap-3.5 pt-3">
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    "Hola POGGI Taller Integral, quisiera consultar por un turno / presupuesto para mi vehículo."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-7 py-3.5 bg-[#e5242b] hover:bg-[#c91d23] text-white text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-lg shadow-[#e5242b]/25 transform hover:-translate-y-0.5 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Consultar por WhatsApp</span>
                </a>
                <a
                  href={`tel:${phone}`}
                  className="px-7 py-3.5 bg-transparent hover:bg-white/10 text-white text-xs font-black uppercase tracking-wider border border-white rounded-md transition-all inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar ahora</span>
                </a>
                <a
                  href="#seguimiento"
                  className="px-6 py-3.5 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider border border-white/20 rounded-md transition-all inline-flex items-center justify-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 text-[#e5242b]" />
                  <span>Estado de mi coche</span>
                </a>
              </div>

              {/* Barra de Estadísticas */}
              <div className="pt-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 bg-black/85 backdrop-blur-md border border-neutral-700/80 rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-neutral-700/80 shadow-2xl">
                  <div className="p-4 sm:p-5 text-center">
                    <span className="block text-2xl sm:text-3xl font-black text-white">30+</span>
                    <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                      Años de experiencia
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 text-center">
                    <span className="block text-2xl sm:text-3xl font-black text-white">5,0</span>
                    <span className="block text-[#e5242b] text-sm tracking-widest my-0.5 font-bold">★★★★★</span>
                    <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Valoración Google
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 text-center">
                    <span className="block text-2xl sm:text-3xl font-black text-white">100+</span>
                    <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                      Clientes satisfechos
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 text-center">
                    <span className="block text-xl sm:text-2xl font-black text-white">08:00–18:00</span>
                    <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-1">
                      Lunes a viernes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: NUESTROS SERVICIOS (FONDO CLARO) */}
        {/* ========================================================================= */}
        <section id="servicios" className="py-20 lg:py-24 bg-[#f4f4f4] text-[#111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#e5242b] text-xs font-black tracking-widest uppercase block mb-2">
                Lo que hacemos
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#111]">
                Nuestros servicios
              </h2>
              <p className="mt-3 text-neutral-600 text-sm sm:text-base">
                Todo lo que necesitas para mantener tu vehículo en las mejores condiciones con la garantía de Poggi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.map((s) => (
                <div
                  key={s.num}
                  className="bg-white border border-neutral-200 p-7 rounded-xl shadow-xs hover:border-[#e5242b]/60 transition-all group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[#e5242b] text-2xl font-black block mb-3 group-hover:scale-105 transition-transform">
                      {s.num}
                    </span>
                    <h3 className="text-lg font-black uppercase text-[#111] mb-2.5">
                      {s.title}
                    </h3>
                    <p className="text-neutral-600 text-sm leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                  <div className="pt-5 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs font-bold text-[#e5242b]">
                    <span>Atención especializada</span>
                    <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 2: ESPECIALIZACIÓN (ELECTRÓNICA AUTOMOTRIZ) */}
        {/* ========================================================================= */}
        <section id="especializacion" className="bg-[#0e0e0e] text-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[580px]">
            {/* Imagen Izquierda */}
            <div
              className="min-h-[360px] lg:min-h-full bg-cover bg-center"
              style={{ backgroundImage: `url('/images/poggi/egr.jpg')` }}
            />

            {/* Texto Derecha */}
            <div className="p-8 sm:p-14 lg:p-20 flex flex-col justify-center">
              <span className="text-[#e5242b] text-xs font-black tracking-widest uppercase block mb-2">
                Especialización
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mb-4">
                Electrónica automotriz
              </h2>
              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 max-w-xl">
                La electrónica es una parte fundamental de los vehículos actuales. Trabajamos en la diagnosis y resolución de problemas relacionados con sus sistemas eléctricos y electrónicos con instrumental de última generación.
              </p>

              <ul className="space-y-3 mb-8 text-sm sm:text-base text-neutral-200">
                {specializationChecks.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-[#e5242b] font-black text-lg leading-none shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div>
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    "Hola POGGI Taller Integral, quisiera consultar por el servicio de diagnosis y electrónica automotriz."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-7 py-3.5 bg-[#e5242b] hover:bg-[#c91d23] text-white text-xs font-black uppercase tracking-wider rounded-md transition-all inline-flex items-center gap-2 shadow-lg shadow-[#e5242b]/25 cursor-pointer"
                >
                  <span>Consultar por WhatsApp</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 3: EXPERIENCIA Y CONFIANZA (NOSOTROS) */}
        {/* ========================================================================= */}
        <section id="nosotros" className="py-20 lg:py-24 bg-[#f4f4f4] text-[#111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-[#e5242b] text-xs font-black tracking-widest uppercase block mb-2">
                POGGI Taller Integral
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#111]">
                Experiencia y confianza
              </h2>
              <p className="mt-3 text-neutral-600 text-sm sm:text-base">
                Un taller profesional donde la atención personalizada y el diagnóstico preciso son parte fundamental de cada trabajo.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 bg-[#101010] text-white border border-neutral-800 rounded-xl overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-neutral-800 shadow-xl max-w-5xl mx-auto">
              <div className="p-6 text-center">
                <span className="block text-3xl sm:text-4xl font-black text-white">30+</span>
                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1.5">
                  Años de experiencia
                </span>
              </div>
              <div className="p-6 text-center">
                <span className="block text-3xl sm:text-4xl font-black text-white">5,0</span>
                <span className="block text-[#e5242b] text-sm tracking-widest my-1 font-bold">★★★★★</span>
                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Valoración Google
                </span>
              </div>
              <div className="p-6 text-center">
                <span className="block text-3xl sm:text-4xl font-black text-white">100+</span>
                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1.5">
                  Clientes satisfechos
                </span>
              </div>
              <div className="p-6 text-center">
                <span className="block text-3xl sm:text-4xl font-black text-white">18:00</span>
                <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mt-1.5">
                  Hora de cierre
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 4: TRABAJOS REALIZADOS (GALERÍA) */}
        {/* ========================================================================= */}
        <section id="trabajos" className="py-20 lg:py-24 bg-[#080808] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#e5242b] text-xs font-black tracking-widest uppercase block mb-2">
                Trabajos realizados
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                Nuestro trabajo
              </h2>
              <p className="mt-3 text-neutral-400 text-sm sm:text-base">
                Una selección de trabajos mecánicos, diagnosis y electrónica realizados en el taller.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg">
                <div className="h-72 overflow-hidden">
                  <img
                    src="/images/poggi/motor.jpg"
                    alt="Motor de vehículo en POGGI Taller Integral"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-bold text-[#e5242b] uppercase tracking-wider block">
                    Mecánica & Diagnosis
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">
                    Revisión integral y ajuste de motor
                  </h4>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg">
                <div className="h-72 overflow-hidden">
                  <img
                    src="/images/poggi/egr.jpg"
                    alt="Trabajo mecánico realizado en POGGI"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-bold text-[#e5242b] uppercase tracking-wider block">
                    Inyección & EGR
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">
                    Descarbonización y sistemas de recirculación
                  </h4>
                </div>
              </div>

              <div className="group relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg">
                <div className="h-72 overflow-hidden">
                  <img
                    src="/images/poggi/distribucion.jpg"
                    alt="Trabajo de distribución realizado en POGGI"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  <span className="text-[11px] font-bold text-[#e5242b] uppercase tracking-wider block">
                    Distribución
                  </span>
                  <h4 className="text-base font-bold text-white mt-1">
                    Kit de distribución y puesta a punto oficial
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 5: SEGUIMIENTO EN VIVO PARA CLIENTES (SAAS INTEGRATION) */}
        {/* ========================================================================= */}
        <section id="seguimiento" className="py-16 bg-[#101010] border-y border-neutral-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e5242b]/15 border border-[#e5242b]/30 text-[#e5242b] text-xs font-black tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transparencia Digital para Conductores</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
              ¿Tu coche está en el taller? Consulta su estado en vivo
            </h3>
            <p className="text-neutral-400 text-sm mt-2 max-w-xl mx-auto">
              Ingresá la matrícula de tu coche o el número de orden para ver el peritaje fotográfico, partes de trabajo y avance de la reparación.
            </p>

            <form
              onSubmit={handleTrackingSubmit}
              className="mt-6 flex flex-col sm:flex-row gap-2 max-w-lg mx-auto"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  placeholder="Ej: 4821 KRP o #1001"
                  className="w-full px-4 py-3.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white font-mono text-sm placeholder:text-neutral-500 focus:outline-none focus:border-[#e5242b] uppercase tracking-wider"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3.5 rounded-lg bg-[#e5242b] hover:bg-[#c91d23] text-white text-xs font-black uppercase tracking-wider transition-all inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md shadow-[#e5242b]/20"
              >
                <Search className="w-4 h-4" />
                <span>Consultar</span>
              </button>
            </form>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECCIÓN 6: NUESTRA UBICACIÓN (MAPA Y CÓMO LLEGAR) */}
        {/* ========================================================================= */}
        <section id="ubicacion" className="py-20 lg:py-24 bg-[#f4f4f4] text-[#111]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-[#e5242b] text-xs font-black tracking-widest uppercase block mb-2">
                Nuestra ubicación
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#111]">
                Ven a visitarnos
              </h2>
              <p className="mt-3 text-neutral-600 text-sm sm:text-base">
                Estamos en Valencia. Encuéntranos fácilmente en C. de Sant Pius X, 13.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
              {/* Mapa Google Maps Embebido */}
              <div className="lg:col-span-8 min-h-[380px] bg-neutral-200 border border-neutral-300 rounded-xl overflow-hidden shadow-xs">
                <iframe
                  title="Ubicación de POGGI Taller Integral en Valencia"
                  src="https://www.google.com/maps?q=Carrer%20de%20Sant%20Pius%20X%2013%2046017%20Valencia&output=embed"
                  width="100%"
                  height="100%"
                  className="min-h-[380px] w-full border-0"
                  loading="lazy"
                />
              </div>

              {/* Ficha de Ubicación */}
              <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-xl p-8 flex flex-col justify-center shadow-xs">
                <span className="text-[#e5242b] text-xs font-black tracking-widest uppercase block mb-1">
                  POGGI TALLER INTEGRAL
                </span>
                <h3 className="text-2xl font-black uppercase text-[#111] mb-4">
                  Estamos aquí.
                </h3>
                <p className="text-neutral-600 text-sm leading-relaxed mb-4">
                  {address}
                </p>
                <div className="mb-6">
                  <strong className="text-xs uppercase tracking-wider text-neutral-900 block mb-1">
                    Horario
                  </strong>
                  <p className="text-neutral-600 text-sm">{hours}</p>
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Carrer+de+Sant+Pius+X+13+46017+Valencia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center px-6 py-3.5 bg-[#e5242b] hover:bg-[#c91d23] text-white text-xs font-black uppercase tracking-wider rounded-md transition-all shadow-md shadow-[#e5242b]/20"
                >
                  Cómo llegar
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />

      {/* ========================================================================= */}
      {/* BARRA MÓVIL INFERIOR FIJA (WhatsApp y Llamada directa) */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#111] border-t border-neutral-700 flex text-center">
        <a
          href={`tel:${phone}`}
          className="flex-1 py-3.5 px-2 text-[11px] font-black uppercase text-white hover:bg-neutral-800 border-r border-neutral-800 flex items-center justify-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-[#e5242b]" />
          <span>Llamar</span>
        </a>
        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            "Hola POGGI Taller Integral, quisiera consultar por un turno / presupuesto para mi vehículo."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3.5 px-2 text-[11px] font-black uppercase text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-1.5"
        >
          <span>WhatsApp</span>
        </a>
        <Link
          href="/estado"
          className="flex-1 py-3.5 px-2 text-[11px] font-black uppercase text-white hover:bg-neutral-800 border-l border-neutral-800 flex items-center justify-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5 text-[#e5242b]" />
          <span>Seguimiento</span>
        </Link>
      </div>
    </div>
  );
}
