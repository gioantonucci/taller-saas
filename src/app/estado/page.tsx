"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function EstadoBusquedaPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim().toUpperCase();
    if (clean) {
      router.push(`/estado/${clean}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#070708] text-white font-sans selection:bg-[#e5242b] selection:text-white antialiased">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-20 relative overflow-hidden">
        {/* Luces volumétricas sutiles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#e5242b]/10 blur-3xl rounded-full pointer-events-none" />

        <div className="max-w-md w-full bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6 relative z-10 backdrop-blur-md">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-950 border border-neutral-800 text-[#e5242b] flex items-center justify-center shadow-lg shadow-black/50">
            <Car className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-black uppercase tracking-wider text-[#e5242b]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e5242b] animate-pulse" />
              <span>Seguimiento Digital</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Estado de tu Vehículo
            </h1>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
              Introduce tu matrícula o número de orden para consultar en tiempo real la fase de trabajo en el taller.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ej: 7812 JKL o 1005"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                className="w-full pl-4 pr-12 py-3.5 rounded-xl bg-neutral-950 border border-neutral-700 font-mono text-sm font-black text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#e5242b] uppercase tracking-wider"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 p-2 rounded-lg bg-[#e5242b] text-white font-bold hover:bg-[#c91d23] transition-colors cursor-pointer"
                title="Consultar"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#e5242b] hover:bg-[#c91d23] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#e5242b]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Consultar Estado Ahora</span>
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-2 text-xs text-neutral-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11px]">Acceso público y directo sin necesidad de registro</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
