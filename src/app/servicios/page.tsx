import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  Wrench,
  Cpu,
  Gauge,
  Disc,
  Cog,
  CheckSquare,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function ServiciosPage() {
  const servicios = [
    {
      icon: Gauge,
      title: "Diagnóstico Computarizado y Escáner Multimarca",
      desc: "Lectura profunda de códigos de avería (DTC), reseteo de luces testigo de Check Engine, ABS y Airbag. Análisis de parámetros de sensores en tiempo real.",
      puntos: ["Escaneo con protocolo OBD-II / CAN Bus", "Prueba de actuadores y cuerpos de mariposa", "Diagnóstico de red electrónica"],
    },
    {
      icon: Disc,
      title: "Sistema de Frenos y Seguridad Activa",
      desc: "Reparación y mantenimiento integral de frenos de disco y tambor. Purga electrónica de módulos ABS y verificación de punto de ebullición del líquido.",
      puntos: ["Cambio de pastillas y rectificado de discos", "Cintas, campanas y cilindros traseros", "Líquido de frenos DOT 4 / 5.1 sintético"],
    },
    {
      icon: Cog,
      title: "Distribución y Correas Sincrónicas",
      desc: "Reemplazo preventivo y correctivo de kits de distribución (correa o cadena), tensores hidráulicos y bomba de refrigerante para prevenir daños severos de válvulas.",
      puntos: ["Kits originales Gates / Dayco / SKF", "Sustitución reglamentaria de bomba de agua", "Inspección de retenes y árboles de levas"],
    },
    {
      icon: Wrench,
      title: "Suspensión, Dirección y Tren Delantero",
      desc: "Inspección de bujes, extremos de dirección, rótulas y amortiguadores. Alineación 3D computarizada y balanceo dinámico de neumáticos.",
      puntos: ["Amortiguadores presurizados con nitrógeno", "Bujes de parrilla en poliuretano / goma", "Alineación láser de ambos ejes"],
    },
    {
      icon: Cpu,
      title: "Inyección Electrónica Nafta y Diésel Common Rail",
      desc: "Limpieza de inyectores por ultrasonido, medición de caudal y estanqueidad. Reemplazo de bombas de combustible de alta y baja presión.",
      puntos: ["Banco de prueba y batea ultrasonido", "Cambio de filtros de micro-partículas", "Calibración de sonda lambda y MAF/MAP"],
    },
    {
      icon: CheckSquare,
      title: "Mantenimiento Preventivo y Service Oficial",
      desc: "Revisiones por kilometraje (10k, 20k, 50k, 100k) manteniendo la validez de garantía con lubricantes 100% sintéticos homologados por fábrica.",
      puntos: ["Aceite sintético homologado", "Revisión integral de 30 puntos", "Informe digital emitido por nuestro SaaS"],
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 bg-slate-50">
        {/* Encabezado */}
        <section className="bg-slate-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Especialización y Alta Tecnología
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mt-2 mb-4">
              Nuestros Servicios de Taller Mecánico
            </h1>
            <p className="max-w-2xl mx-auto text-slate-300 text-sm sm:text-base leading-relaxed">
              Trabajamos con instrumental de última generación, repuestos homologados y peritaje fotográfico respaldado por nuestra plataforma SaaS.
            </p>
          </div>
        </section>

        {/* Listado de Servicios */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {servicios.map((s, idx) => {
                const Icon = s.icon;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h2>
                      <p className="text-xs text-slate-600 leading-relaxed mb-4">{s.desc}</p>

                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        {s.puntos.map((punto, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-2 text-xs text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            <span>{punto}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <a
                        href="https://wa.me/5491145678900?text=Hola,%20quisiera%20consultar%20por%20el%20servicio%20de%20taller"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
                      >
                        <span>Consultar presupuesto</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banner Garantía */}
            <div className="mt-16 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Garantía Escrita</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  3 meses o 5.000 km en todos los trabajos
                </h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Cada vehículo intervenido queda registrado en el historial clínico digital de nuestro SaaS con comprobantes, remitos y fotos de peritaje accesibles en cualquier momento.
                </p>
              </div>

              <Link
                href="/login"
                className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shrink-0 transition-colors"
              >
                Acceso a la Plataforma
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
