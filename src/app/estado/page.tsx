"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Car, ArrowRight, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function EstadoBusquedaPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (clean) {
      router.push(`/estado/${clean}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-400/20">
            <Car className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              Portal de Clientes
            </span>
            <h1 className="text-2xl font-black tracking-tight">
              Seguimiento de tu Vehículo
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ingresá tu Número de Orden de Trabajo para consultar en tiempo real el estado de reparación de tu auto.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Ej: 1005"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 font-mono text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="submit"
                className="absolute right-2.5 top-2.5 p-1.5 rounded-xl bg-sky-500 text-slate-950 font-bold hover:bg-sky-400 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Consultar Estado Ahora</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Consulta 100% pública y sin necesidad de login</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
