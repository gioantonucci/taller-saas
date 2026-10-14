"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { useTenantSettings } from "@/hooks/useTenantSettings";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Send,
  CheckCircle,
  MessageCircle,
} from "lucide-react";

export default function ContactoPage() {
  const { settings } = useTenantSettings();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    vehiculo: "",
    mensaje: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  const cleanPhone = (settings.whatsapp || "+54 9 11 4567-8900").replace(/\D/g, "");

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-slate-50">
        <section className="bg-slate-900 text-white py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Atención Personalizada
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-3">
              Contacto y Turnos en {settings.tallerNombre || "Taller Central Pro"}
            </h1>
            <p className="max-w-xl mx-auto text-slate-300 text-sm leading-relaxed">
              Comunicate con nuestros asesores de recepción para coordinar diagnósticos, revisiones y presupuestos.
            </p>
          </div>
        </section>

        <section className="py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {/* Información y Dirección */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                  <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
                    Información Directa
                  </h2>

                  <div className="space-y-4 text-xs text-slate-700">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Ubicación</span>
                        <p className="text-slate-600">
                          {settings.direccion || "Av. del Libertador 4580, Buenos Aires"}
                        </p>
                        <p className="text-slate-400 text-[11px]">Acceso rápido para auxilio y grúas</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Teléfonos</span>
                        <p className="text-slate-600">{settings.whatsapp || "+54 9 11 4567-8900"} (WhatsApp Oficial)</p>
                        <p className="text-slate-600">{settings.email || "contacto@tallerpro.com"} (Recepción)</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">Horarios del Taller</span>
                        <p className="text-slate-600">
                          {settings.horarios || "Lunes a Viernes: 08:00 a 19:00 hs | Sábados: 08:30 a 13:00 hs"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        `Hola ${settings.tallerNombre}, quisiera consultar para coordinar un turno para mi auto.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Escribir por WhatsApp Directo</span>
                    </a>
                  </div>
                </div>

                {/* Mapa Google Maps */}
                <div className="h-64 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative bg-slate-100">
                  <iframe
                    title="Ubicación Google Maps"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13141.229194200424!2d-58.43503525!3d-34.5710688!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcb59a930768e9%3A0xc3b865518b628ec2!2sAv.%20del%20Libertador%2C%20Buenos%20Aires!5e0!3m2!1ses!2sar!4v1700000000000!5m2!1ses!2sar"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    className="w-full h-full"
                  />
                </div>
              </div>

              {/* Formulario de Consulta / Reserva */}
              <div className="lg:col-span-7">
                <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900 mb-2">Envíanos tu consulta</h2>
                  <p className="text-xs text-slate-500 mb-6">
                    Completá tus datos y el modelo de tu auto para brindarte una estimación inicial de tiempo y costo.
                  </p>

                  {formSubmitted ? (
                    <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
                      <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h4 className="font-bold text-slate-900 text-base">¡Mensaje Enviado con Éxito!</h4>
                      <p className="text-xs text-slate-600 max-w-sm mx-auto">
                        Nuestro equipo de recepción revisará los datos de tu vehículo y se comunicará a la brevedad por teléfono o WhatsApp.
                      </p>
                      <button
                        onClick={() => setFormSubmitted(false)}
                        className="text-xs font-bold text-sky-600 hover:underline pt-2 inline-block"
                      >
                        Enviar otra consulta
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nombre y Apellido *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Marcelo Gómez"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Teléfono de Contacto *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="Ej: 11 4455-6677"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Email (opcional)
                          </label>
                          <input
                            type="email"
                            placeholder="tuemail@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Vehículo (Marca, Modelo, Año)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: VW Gol 2019 / Toyota Corolla"
                            value={formData.vehiculo}
                            onChange={(e) => setFormData({ ...formData, vehiculo: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Motivo de la consulta o falla detectada *
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Describí brevemente el ruido, falla, service periódico o síntoma del vehículo..."
                          value={formData.mensaje}
                          onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-xs transition-colors shadow-md"
                      >
                        <Send className="w-4 h-4 text-sky-400" />
                        <span>Enviar Solicitud de Turno</span>
                      </button>
                    </form>
                  )}
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
