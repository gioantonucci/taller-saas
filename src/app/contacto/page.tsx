"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  MessageCircle,
  ShieldCheck,
  Calendar,
  ChevronRight,
} from "lucide-react";

export default function ContactoPage() {
  const { settings } = useTenantSettings();

  const phone = settings.whatsapp || "+34 656 40 62 86";
  const cleanPhone = phone.replace(/\D/g, "");
  const address = settings.direccion || "C. de Sant Pius X, 13, 46017 València, España";
  const email = settings.email || "poggitallerintegral@gmail.com";
  const hours = settings.horarios || "Lunes a viernes · 08:00–18:00";

  return (
    <div className="flex flex-col min-h-screen bg-[#080808] text-white">
      <Navbar />

      <main className="flex-1">
        {/* Encabezado */}
        <section className="bg-neutral-950 border-b border-neutral-800 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-black uppercase tracking-widest text-[#e5242b] block mb-2">
              POGGI TALLER INTEGRAL
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mb-3">
              Contacto y Ubicación
            </h1>
            <p className="max-w-xl mx-auto text-neutral-400 text-sm leading-relaxed">
              Coordinamos turnos, diagnósticos y consultas de forma directa e inmediata a través de nuestro canal de WhatsApp y atención telefónica.
            </p>
          </div>
        </section>

        {/* Canales Directos */}
        <section className="py-16 bg-[#0e0e0e]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Canal WhatsApp */}
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl flex flex-col justify-between shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider block mb-1">
                    Canal Principal
                  </span>
                  <h3 className="text-2xl font-black uppercase text-white mb-3">
                    Coordinar por WhatsApp
                  </h3>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                    Escribinos directamente con la matrícula o modelo de tu coche para consultar disponibilidad, presupuestos o dudas sobre la reparación.
                  </p>
                </div>
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    "Hola POGGI Taller Integral, quisiera consultar por un turno / presupuesto para mi vehículo."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir chat de WhatsApp</span>
                </a>
              </div>

              {/* Canal Telefónico */}
              <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-2xl flex flex-col justify-between shadow-lg">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#e5242b]/10 text-[#e5242b] flex items-center justify-center mb-5">
                    <Phone className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-black uppercase text-[#e5242b] tracking-wider block mb-1">
                    Llamada Directa
                  </span>
                  <h3 className="text-2xl font-black uppercase text-white mb-3">
                    Llamar al Taller
                  </h3>
                  <p className="text-neutral-400 text-sm leading-relaxed mb-6">
                    Comunícate con nuestro equipo en horario de taller para asistencia telefónica, consultas urgentes o coordinación presencial.
                  </p>
                </div>
                <a
                  href={`tel:${phone}`}
                  className="w-full flex items-center justify-center gap-2 bg-[#e5242b] hover:bg-[#c91d23] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all"
                >
                  <Phone className="w-4 h-4" />
                  <span>Llamar al {phone}</span>
                </a>
              </div>
            </div>

            {/* Información de Taller y Mapa */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 lg:p-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-6">
                  <h3 className="text-2xl font-black uppercase text-white tracking-tight">
                    Datos del Taller
                  </h3>

                  <div className="space-y-4 text-sm text-neutral-300">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#e5242b] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-white uppercase text-xs tracking-wider">
                          Dirección
                        </strong>
                        <span>{address}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#e5242b] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-white uppercase text-xs tracking-wider">
                          Horario de Atención
                        </strong>
                        <span>{hours}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-[#e5242b] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-white uppercase text-xs tracking-wider">
                          Correo Electrónico
                        </strong>
                        <span>{email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href="https://www.google.com/maps/dir/?api=1&destination=Carrer+de+Sant+Pius+X+13+46017+Valencia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all border border-neutral-700"
                    >
                      <MapPin className="w-4 h-4 text-[#e5242b]" />
                      <span>Cómo llegar en Google Maps</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Mapa Interactivo */}
                <div className="lg:col-span-6 min-h-[300px] h-full rounded-xl overflow-hidden border border-neutral-800 bg-neutral-800">
                  <iframe
                    title="Ubicación de POGGI Taller Integral en Valencia"
                    src="https://www.google.com/maps?q=Carrer%20de%20Sant%20Pius%20X%2013%2046017%20Valencia&output=embed"
                    width="100%"
                    height="100%"
                    className="min-h-[300px] w-full border-0"
                    loading="lazy"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
