"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Users,
  Search,
  Plus,
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { clientFormSchema, ClientFormValues } from "@/lib/validations";

export default function ClientesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      dni: "",
      telefono: "",
      email: "",
      direccion: "",
    },
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  const openCreateModal = () => {
    setEditingClient(null);
    setSubmitError(null);
    reset({
      nombre: "",
      apellido: "",
      dni: "",
      telefono: "",
      email: "",
      direccion: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setSubmitError(null);
    setValue("nombre", client.nombre);
    setValue("apellido", client.apellido);
    setValue("dni", client.dni);
    setValue("telefono", client.telefono || "");
    setValue("email", client.email || "");
    setValue("direccion", client.direccion || "");
    setModalOpen(true);
  };

  const onSubmit = async (values: ClientFormValues) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const isEditing = Boolean(editingClient);
      const url = isEditing ? `/api/clients/${editingClient.id}` : "/api/clients";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Ocurrió un error al guardar el cliente");
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      setActionSuccess(
        isEditing
          ? `Cliente ${values.nombre} ${values.apellido} actualizado exitosamente.`
          : `Cliente ${values.nombre} ${values.apellido} registrado exitosamente.`
      );
      setTimeout(() => setActionSuccess(null), 4000);
      fetchClients();
    } catch {
      setSubmitError("Error de conexión con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSoftDelete = async (client: any) => {
    const confirmDelete = window.confirm(
      `¿Confirmás la eliminación del cliente ${client.nombre} ${client.apellido} (DNI ${client.dni})?\n\nSe conservará su historial y los vehículos asociados.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setActionSuccess(`Cliente ${client.nombre} ${client.apellido} eliminado correctamente.`);
        setTimeout(() => setActionSuccess(null), 4000);
        fetchClients();
      } else {
        const data = await res.json();
        alert(data.error || "No se pudo eliminar el cliente");
      }
    } catch {
      alert("Error de conexión al eliminar al cliente");
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider block">
                Módulo de Recepción
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Clientes
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestión centralizada de titulares, historial de vehículos y contacto directo.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* Alerta de Acción Exitosa */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Buscador Rápido */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cliente por DNI, Nombre, Apellido, Teléfono o Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all font-medium"
          />
        </div>
        <button
          onClick={fetchClients}
          title="Refrescar lista"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
        </button>
      </div>

      {/* Tabla de Clientes Activos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Listado de Clientes Activos ({clients.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Bajas lógicas excluidas</span>
        </div>

        {loading && clients.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs">Cargando directorio de clientes...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No se encontraron clientes activos</p>
            <p className="text-xs">Podés registrar uno nuevo utilizando el botón "Nuevo Cliente".</p>
          </div>
        ) : (
          <>
            {/* VISTA MOBILE: Tarjetas Responsivas */}
            <div className="md:hidden divide-y divide-slate-100">
              {clients.map((c) => (
                <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/app/clientes/${c.id}`}
                        className="font-bold text-slate-900 hover:text-sky-600 transition-colors text-sm block"
                      >
                        {c.nombre} {c.apellido}
                      </Link>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                        DNI {c.dni}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        title="Editar Cliente"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSoftDelete(c)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/app/clientes/${c.id}`}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-600 text-slate-700 hover:text-white transition-colors"
                        title="Ver Ficha Completa"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Contacto & Dirección */}
                  <div className="space-y-1 text-xs">
                    {c.telefono ? (
                      <a
                        href={`tel:${c.telefono}`}
                        className="flex items-center gap-1.5 text-slate-700 font-medium hover:text-sky-600"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{c.telefono}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-[11px] block">Sin teléfono</span>
                    )}

                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="flex items-center gap-1.5 text-slate-500 text-[11px] hover:text-sky-600 truncate"
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </a>
                    )}

                    {c.direccion && (
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.direccion}</span>
                      </div>
                    )}
                  </div>

                  {/* Vehículos del cliente */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Vehículos ({c.vehicles?.length || 0})
                    </span>
                    <div className="flex flex-wrap gap-1 items-center justify-end">
                      {c.vehicles?.map((v: any) => (
                        <Link
                          key={v.id}
                          href={`/app/vehiculos/${v.patente}`}
                          className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-700 border border-slate-200"
                        >
                          {v.patente}
                        </Link>
                      ))}
                      {(!c.vehicles || c.vehicles.length === 0) && (
                        <span className="text-[10px] text-slate-400 italic">Sin vehículos asociados</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA DESKTOP: Tabla con Min-Width */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="p-3.5">Cliente / DNI</th>
                    <th className="p-3.5">Contacto</th>
                    <th className="p-3.5">Dirección</th>
                    <th className="p-3.5">Vehículos</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <Link
                          href={`/app/clientes/${c.id}`}
                          className="font-bold text-slate-900 hover:text-sky-600 transition-colors block text-sm"
                        >
                          {c.nombre} {c.apellido}
                        </Link>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                          DNI {c.dni}
                        </span>
                      </td>

                      <td className="p-3.5 space-y-1">
                        {c.telefono ? (
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.telefono}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin teléfono</span>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {c.direccion ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{c.direccion}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No especificada</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                            {c.vehicles?.length || 0}
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {c.vehicles?.slice(0, 2).map((v: any) => (
                              <Link
                                key={v.id}
                                href={`/app/vehiculos/${v.patente}`}
                                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-700 border border-slate-200"
                              >
                                {v.patente}
                              </Link>
                            ))}
                            {(c.vehicles?.length || 0) > 2 && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                +{c.vehicles.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                            title="Editar Cliente"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleSoftDelete(c)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/app/clientes/${c.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-600 text-slate-700 hover:text-white transition-colors ml-1"
                            title="Ver Ficha Completa"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal / Sheet de Alta y Edición con ZOD + REACT HOOK FORM */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                  {editingClient ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingClient ? "Editar Datos del Cliente" : "Alta de Nuevo Cliente"}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Validación estricta con Zod + React Hook Form
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error general */}
            {submitError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("nombre")}
                    placeholder="Ej. Juan Carlos"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                      errors.nombre
                        ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                    }`}
                  />
                  {errors.nombre && (
                    <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                      {errors.nombre.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellido <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("apellido")}
                    placeholder="Ej. Pérez"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                      errors.apellido
                        ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                    }`}
                  />
                  {errors.apellido && (
                    <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                      {errors.apellido.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    {...register("telefono")}
                    placeholder="Ej. +54 9 11 5566-7788"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                      errors.telefono
                        ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                    }`}
                  />
                  {errors.telefono && (
                    <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                      {errors.telefono.message}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    CUIL / DNI <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register("dni")}
                    placeholder="Ej. 20-34890123-8 o 34890123"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 ${
                      errors.dni
                        ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                    }`}
                  />
                  {errors.dni && (
                    <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                      {errors.dni.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección / Localidad (Opcional)
                  </label>
                  <input
                    type="text"
                    {...register("direccion")}
                    placeholder="Ej. Av. Corrientes 3420, CABA"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/40 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    type="email"
                    {...register("email")}
                    placeholder="cliente@ejemplo.com"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 font-medium ${
                      errors.email
                        ? "border-rose-300 focus:ring-rose-500 bg-rose-50/20"
                        : "border-slate-200 focus:ring-sky-500 bg-slate-50/40"
                    }`}
                  />
                  {errors.email && (
                    <span className="text-[10px] font-semibold text-rose-600 mt-1 block">
                      {errors.email.message}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>{editingClient ? "Actualizar Cliente" : "Crear Cliente"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
