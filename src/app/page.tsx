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
  Cpu,
  Zap,
  CircleDot,
  Wind,
  Activity,
  Phone,
  MapPin,
  Clock,
  Search,
  Check,
  ChevronRight,
  ArrowUpRight,
  MessageCircle,
  ShieldCheck,
  Award,
  Sparkles,
} from "lucide-react";

export default function PoggiServiceLandingPage() {
  const { settings } = useTenantSettings();
  const router = useRouter();
  const [plateQuery, setPlateQuery] = useState("");

  const phone = "+34 656 40 62 86";
  const cleanPhone = "34656406286";
  const address = "C. de Sant Pius X, 13, 46017 València, España";
  const email = "poggitallerintegral@gmail.com";
  const hours = "Lunes a viernes · 08:00–18:00";

  const handleTrackingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = plateQuery.trim().toUpperCase();
    if (clean) {
      router.push(`/estado/${clean}`);
    }
  };

  // Los 6 servicios oficiales de POGGI Taller Integral
  const coreServices = [
    {
      num: "01",
      icon: Wrench,
      title: "Mecánica general",
      description: "Mantenimiento, revisiones y reparación de averías.",
      tag: "Mantenimiento & Reparación",
    },
    {
      num: "02",
      icon: Activity,
      title: "Diagnosis",
      description: "Localización precisa del origen de las averías.",
      tag: "Diagnosis Avanzada",
    },
    {
      num: "03",
      icon: Zap,
      title: "Electricidad",
      description: "Sistemas eléctricos y electrónicos del automóvil.",
      tag: "Sistemas Eléctricos",
    },
    {
      num: "04",
      icon: CircleDot,
      title: "Neumáticos",
      description: "Montaje, equilibrado y mantenimiento.",
      tag: "Rodaje & Seguridad",
    },
    {
      num: "05",
      icon: Wind,
      title: "Climatización",
      description: "Revisión y reparación del aire acondicionado.",
      tag: "Confort & Clima",
    },
    {
      num: "06",
      icon: Cpu,
      title: "Electrónica automotriz",
      description: "Diagnosis y reparación de sistemas electrónicos.",
      tag: "Especialización Técnica",
    },
  ];

  // Puntos clave de la especialización oficial
  const specializationItems = [
    "Diagnosis electrónica",
    "Unidades de control y sistemas de gestión",
    "Sistemas eléctricos del vehículo",
    "Detección de averías electrónicas",
    "Reparación y mantenimiento",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#070708] text-slate-100 font-sans selection:bg-[#e5242b] selection:text-white antialiased">
      <Navbar />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 1. HERO SERVICE-FOCUSED CON DISEÑO MODERNO Y MINIMALISTA */}
        {/* ========================================================================= */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden border-b border-neutral-800/80">
          {/* Luces volumétricas sutiles */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#e5242b]/15 via-transparent to-transparent blur-3xl pointer-events-none" />
          <div className="absolute -top-24 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Columna Izquierda: Mensaje y Acción de Servicio */}
              <div className="lg:col-span-7 space-y-6">
                {/* Badge de Ubicación y Trayectoria */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-[#e5242b] animate-pulse" />
                  <span className="text-[#e5242b] uppercase tracking-wider font-black">
                    Taller de automoción
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span className="text-neutral-300">Valencia</span>
                </div>

                {/* Título Principal de Poggi */}
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white leading-[1.02]">
                  Más de <span className="text-[#e5242b] relative inline-block">30 años</span>{" "}
                  cuidando tu vehículo.
                </h1>

                {/* Bajada Oficial de Poggi */}
                <p className="text-neutral-300 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
                  Mantenimiento, diagnóstico, reparación y electrónica automotriz con experiencia, tecnología y atención personalizada.
                </p>

                {/* Botones de Consulta Inmediata (Servicio Directo por WhatsApp y Teléfono) */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      "Hola POGGI Taller Integral, quisiera hacer una consulta sobre mi vehículo."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#25D366]/20 flex items-center gap-2 transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Consultar por WhatsApp</span>
                  </a>

                  <a
                    href={`tel:${phone}`}
                    className="px-6 py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider border border-neutral-700 hover:border-neutral-500 transition-all flex items-center gap-2"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#e5242b]" />
                    <span>Llamar: {phone}</span>
                  </a>
                </div>

                {/* Widget Moderno: Consulta de Estado de Coche en Taller */}
                <div className="pt-4 max-w-lg">
                  <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 backdrop-blur-md">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-[#e5242b]" />
                        <span>¿Tu coche está en el taller?</span>
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        Seguimiento en vivo
                      </span>
                    </div>

                    <form onSubmit={handleTrackingSubmit} className="flex gap-2">
                      <input
                        type="text"
                        value={plateQuery}
                        onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
                        placeholder="Introduce tu matrícula (ej: 4821 KRP)"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-700/80 text-white text-xs font-mono uppercase tracking-wider placeholder:text-neutral-600 focus:outline-none focus:border-[#e5242b]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ver estado</span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Tarjeta Visual de Servicio con Métricas */}
              <div className="lg:col-span-5">
                <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-2xl backdrop-blur-sm p-2">
                  <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden">
                    <img
                      src="/images/poggi/motor.jpg"
                      alt="Motor de vehículo en POGGI Taller Integral"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-neutral-950/80 backdrop-blur-md border border-neutral-800/80">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#e5242b]">
                            Servicio Especializado
                          </span>
                          <h3 className="text-sm font-black uppercase text-white mt-0.5">
                            POGGI Taller Integral
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800">
                          València
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Métricas Oficiales de Poggi */}
                  <div className="grid grid-cols-2 gap-2 p-2">
                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
                      <span className="block text-2xl font-black text-white">30+</span>
                      <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                        Años de experiencia
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-black text-white">5,0</span>
                        <span className="text-[#e5242b] text-xs font-black tracking-widest">
                          ★★★★★
                        </span>
                      </div>
                      <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                        Valoración
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
                      <span className="block text-2xl font-black text-white">100+</span>
                      <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                        Clientes satisfechos
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80">
                      <span className="block text-xl font-black text-white">08:00–18:00</span>
                      <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                        Lunes a viernes
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 2. CATÁLOGO DE SERVICIOS — BENTO GRID MODERNO ENFOCADO EN SOLUCIONES */}
        {/* ========================================================================= */}
        <section id="servicios" className="py-20 lg:py-28 relative bg-[#0b0b0d]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Cabecera de Sección */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6 border-b border-neutral-800 pb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#e5242b] mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e5242b]" />
                  <span>Lo que hacemos</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  Nuestros servicios
                </h2>
              </div>
              <p className="text-neutral-400 text-sm max-w-md">
                Todo lo que necesitas para mantener tu vehículo en las mejores condiciones con diagnóstico preciso y repuestos de confianza.
              </p>
            </div>

            {/* Grid Bento de los 6 Servicios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {coreServices.map((service) => {
                const IconComponent = service.icon;
                return (
                  <div
                    key={service.num}
                    className="group relative p-7 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between hover:shadow-xl hover:shadow-black/50"
                  >
                    <div>
                      {/* Top Fila: Número e Icono */}
                      <div className="flex items-center justify-between mb-6">
                        <span className="w-11 h-11 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-[#e5242b] group-hover:scale-105 group-hover:border-[#e5242b]/40 transition-all">
                          <IconComponent className="w-5 h-5" />
                        </span>
                        <span className="text-xs font-mono font-bold text-neutral-500">
                          {service.num}
                        </span>
                      </div>

                      {/* Tag de Categoría */}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                        {service.tag}
                      </span>

                      {/* Nombre y Descripción Oficial */}
                      <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-2.5 group-hover:text-white">
                        {service.title}
                      </h3>
                      <p className="text-neutral-400 text-sm leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Botón de Consulta Específica por WhatsApp */}
                    <div className="pt-6 mt-6 border-t border-neutral-800/80">
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hola POGGI Taller Integral, quisiera consultar por el servicio de ${service.title}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-between w-full text-xs font-bold text-neutral-300 hover:text-[#25D366] transition-colors"
                      >
                        <span>Consultar servicio</span>
                        <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-[#25D366] transition-colors" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 3. ESPECIALIZACIÓN TÉCNICA (ELECTRÓNICA AUTOMOTRIZ) */}
        {/* ========================================================================= */}
        <section id="especializacion" className="py-20 lg:py-28 bg-[#070708] border-y border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-neutral-900/70 border border-neutral-800 overflow-hidden shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
                {/* Visual / Fotografía Oficial */}
                <div className="lg:col-span-6 relative min-h-[360px] lg:min-h-[500px]">
                  <img
                    src="/images/poggi/egr.jpg"
                    alt="Trabajo mecánico y diagnosis electrónica en POGGI"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-neutral-950/80 lg:from-transparent lg:to-neutral-950/90" />
                  
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950/90 border border-neutral-800 text-xs font-mono text-neutral-300 backdrop-blur-md">
                      <Cpu className="w-3.5 h-3.5 text-[#e5242b]" />
                      <span>Diagnosis de centralitas y sistemas de gestión</span>
                    </div>
                  </div>
                </div>

                {/* Contenido Técnico y Checklist */}
                <div className="lg:col-span-6 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#e5242b] mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e5242b]" />
                    <span>Especialización</span>
                  </div>

                  <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white mb-4">
                    Electrónica automotriz
                  </h2>

                  <p className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                    La electrónica es una parte fundamental de los vehículos actuales. Trabajamos en la diagnosis y resolución de problemas relacionados con sus sistemas eléctricos y electrónicos.
                  </p>

                  {/* Checklist Oficial de Especialización */}
                  <div className="space-y-3 mb-8">
                    {specializationItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-md bg-[#e5242b]/15 border border-[#e5242b]/30 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-[#e5242b] stroke-[3]" />
                        </div>
                        <span className="text-sm font-medium text-neutral-200">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Directo a WhatsApp */}
                  <div>
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        "Hola POGGI Taller Integral, quisiera consultar por diagnosis o un problema de electrónica automotriz en mi coche."
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 rounded-xl bg-[#e5242b] hover:bg-[#c91d23] text-white text-xs font-black uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-lg shadow-[#e5242b]/25"
                    >
                      <span>Consultar servicio por WhatsApp</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. EXPERIENCIA Y CONFIANZA (NOSOTROS) */}
        {/* ========================================================================= */}
        <section id="nosotros" className="py-20 lg:py-24 bg-[#0b0b0d]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
              <span className="text-xs font-black uppercase tracking-widest text-[#e5242b] block">
                POGGI Taller Integral
              </span>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                Experiencia y confianza
              </h2>
              <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
                Un taller profesional donde la atención personalizada y el diagnóstico preciso son parte del trabajo.
              </p>
            </div>

            {/* Banner Moderno de Compromiso */}
            <div className="max-w-4xl mx-auto p-8 rounded-2xl bg-neutral-900/70 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#e5242b]/10 border border-[#e5242b]/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-7 h-7 text-[#e5242b]" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white uppercase tracking-tight">
                    Atención personalizada y directa
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Trato transparente con el mecánico a cargo y diagnósticos explicados en detalle.
                  </p>
                </div>
              </div>

              <a
                href={`tel:${phone}`}
                className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider shrink-0 transition-colors flex items-center gap-2"
              >
                <Phone className="w-3.5 h-3.5 text-[#e5242b]" />
                <span>Contactar: {phone}</span>
              </a>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. TRABAJOS REALIZADOS (GALERÍA TÉCNICA) */}
        {/* ========================================================================= */}
        <section id="trabajos" className="py-20 lg:py-28 bg-[#070708] border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6 border-b border-neutral-800 pb-8">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#e5242b] mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e5242b]" />
                  <span>Trabajos realizados</span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                  Nuestro trabajo
                </h2>
              </div>
              <p className="text-neutral-400 text-sm max-w-md">
                Una selección de trabajos realizados en el taller.
              </p>
            </div>

            {/* Galería con las 3 Imágenes Oficiales de Poggi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="group rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-lg">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/poggi/motor.jpg"
                    alt="Motor de vehículo en POGGI Taller Integral"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[11px] font-mono font-bold text-neutral-300 bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
                    Mecánica de Precisión
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="text-sm font-bold uppercase text-white tracking-wide">
                    Motor y Mecánica Integral
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Revisión de componentes críticos y ajuste técnico.
                  </p>
                </div>
              </div>

              <div className="group rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-lg">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/poggi/egr.jpg"
                    alt="Trabajo mecánico realizado en POGGI"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[11px] font-mono font-bold text-neutral-300 bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
                    Diagnosis & Sistemas
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="text-sm font-bold uppercase text-white tracking-wide">
                    Inyección y Válvula EGR
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Limpieza, diagnosis electrónica y reemplazo preventivo.
                  </p>
                </div>
              </div>

              <div className="group rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/60 shadow-lg">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/poggi/distribucion.jpg"
                    alt="Trabajo de distribución realizado en POGGI"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-3 text-[11px] font-mono font-bold text-neutral-300 bg-black/60 px-2 py-1 rounded backdrop-blur-xs">
                    Distribución
                  </span>
                </div>
                <div className="p-5">
                  <h4 className="text-sm font-bold uppercase text-white tracking-wide">
                    Kit de Distribución
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Sustitución programada y calibración de puesta a punto.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. UBICACIÓN EN VALENCIA (VEN A VISITARNOS) */}
        {/* ========================================================================= */}
        <section id="ubicacion" className="py-20 lg:py-28 bg-[#0b0b0d] border-t border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#e5242b] mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e5242b]" />
                <span>Nuestra ubicación</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
                Ven a visitarnos
              </h2>
              <p className="text-neutral-400 text-sm sm:text-base mt-2">
                Estamos en Valencia. Encuéntranos fácilmente en C. de Sant Pius X, 13.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Mapa de Google Maps Embebido */}
              <div className="lg:col-span-8 rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 min-h-[380px] shadow-xl">
                <iframe
                  title="Ubicación de POGGI Taller Integral en Valencia"
                  src="https://www.google.com/maps?q=Carrer%20de%20Sant%20Pius%20X%2013%2046017%20Valencia&output=embed"
                  width="100%"
                  height="100%"
                  className="w-full h-full min-h-[380px] border-0"
                  loading="lazy"
                />
              </div>

              {/* Ficha de Ubicación y Contacto Directo */}
              <div className="lg:col-span-4 rounded-3xl p-8 bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between shadow-xl">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#e5242b] block mb-1">
                      POGGI TALLER INTEGRAL
                    </span>
                    <h3 className="text-2xl font-black uppercase text-white">
                      Estamos aquí.
                    </h3>
                  </div>

                  <div className="space-y-4 text-xs text-neutral-300">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-[#e5242b] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-white uppercase text-[11px] mb-0.5">
                          Dirección
                        </strong>
                        <p className="text-neutral-300">{address}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-4 h-4 text-[#e5242b] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-white uppercase text-[11px] mb-0.5">
                          Horario
                        </strong>
                        <p className="text-neutral-300">{hours}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-[#e5242b] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-white uppercase text-[11px] mb-0.5">
                          Teléfono
                        </strong>
                        <a href={`tel:${phone}`} className="text-white hover:text-[#e5242b] font-bold">
                          {phone}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-800 space-y-2">
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Carrer+de+Sant+Pius+X+13+46017+Valencia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl bg-[#e5242b] hover:bg-[#c91d23] text-white text-xs font-black uppercase tracking-wider text-center block transition-all shadow-md shadow-[#e5242b]/20"
                  >
                    Cómo llegar en Google Maps
                  </a>

                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      "Hola POGGI Taller Integral, quisiera hacer una consulta."
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>WhatsApp directo</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />

      {/* ========================================================================= */}
      {/* BARRA MÓVIL INFERIOR FIJA (Llamar, WhatsApp, Seguimiento) */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800 flex text-center">
        <a
          href={`tel:${phone}`}
          className="flex-1 py-3 px-2 text-[10px] font-black uppercase text-neutral-300 hover:text-white border-r border-neutral-800/80 flex items-center justify-center gap-1.5"
        >
          <Phone className="w-3.5 h-3.5 text-[#e5242b]" />
          <span>Llamar</span>
        </a>
        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            "Hola POGGI Taller Integral, quisiera hacer una consulta."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 px-2 text-[10px] font-black uppercase text-white bg-[#25D366] flex items-center justify-center gap-1.5"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-white" />
          <span>WhatsApp</span>
        </a>
        <Link
          href="/estado"
          className="flex-1 py-3 px-2 text-[10px] font-black uppercase text-neutral-300 hover:text-white border-l border-neutral-800/80 flex items-center justify-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5 text-[#e5242b]" />
          <span>Mi coche</span>
        </Link>
      </div>
    </div>
  );
}
