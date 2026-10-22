"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  Wrench,
  ClipboardList,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  KeyRound,
  Mail,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowRight,
  X,
  UserMinus,
} from "lucide-react";
import { StaffMember } from "@/types";
import { useAppDialog } from "@/components/AppDialog";

export default function GestionPersonalPage() {
  const { confirm, alert } = useAppDialog();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"TODOS" | "MECHANIC" | "RECEPTION" | "INACTIVE">("TODOS");

  // Modal Alta
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    role: "MECHANIC" as "MECHANIC" | "RECEPTION",
  });

  // Notificación de éxito temporal
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      } else {
        const err = await res.json();
        console.error("Error al obtener personal:", err);
      }
    } catch (e) {
      console.error("Error en fetchStaff:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Contadores
  const counts = useMemo(() => {
    const total = staff.length;
    const activos = staff.filter((s) => s.status === "ACTIVE").length;
    const mecanicos = staff.filter(
      (s) => s.status === "ACTIVE" && (s.role === "MECHANIC" || s.role === "MECANICO")
    ).length;
    const recepcion = staff.filter(
      (s) => s.status === "ACTIVE" && (s.role === "RECEPTION" || s.role === "RECEPCION")
    ).length;
    const inactivos = staff.filter((s) => s.status === "INACTIVE").length;
    return { total, activos, mecanicos, recepcion, inactivos };
  }, [staff]);

  // Filtrado
  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const matchSearch =
        search === "" ||
        `${member.nombre} ${member.apellido || ""}`.toLowerCase().includes(search.toLowerCase()) ||
        member.email.toLowerCase().includes(search.toLowerCase());

      if (!matchSearch) return false;

      if (roleFilter === "INACTIVE") {
        return member.status === "INACTIVE";
      }

      if (roleFilter === "MECHANIC") {
        return (
          member.status === "ACTIVE" &&
          (member.role === "MECHANIC" || member.role === "MECANICO")
        );
      }

      if (roleFilter === "RECEPTION") {
        return (
          member.status === "ACTIVE" &&
          (member.role === "RECEPTION" || member.role === "RECEPCION")
        );
      }

      return true;
    });
  }, [staff, search, roleFilter]);

  // Dar de baja a un miembro
  const handleDarDeBaja = async (member: StaffMember) => {
    const rolLabel =
      member.role === "MECHANIC" || member.role === "MECANICO"
        ? "Mecánico"
        : "Recepción";

    const confirmed = await confirm({
      title: `¿Dar de baja a ${member.nombre} ${member.apellido || ""}?`,
      message: `El usuario (${rolLabel}) será desactivado del sistema.`,
      description:
        "Ya no podrá iniciar sesión en la plataforma ni ser asignado a nuevas órdenes de trabajo. Todos los registros históricos, trabajos previos y logs de auditoría se conservarán de forma íntegra.",
      confirmText: "Confirmar baja",
      cancelText: "Cancelar",
      variant: "danger",
      icon: "danger",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INACTIVE" }),
      });

      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "No se pudo dar de baja",
          message: data.error || "Ocurrió un error al dar de baja al usuario",
          variant: "danger",
        });
        return;
      }

      triggerToast(`Se dio de baja a ${member.nombre} ${member.apellido || ""}`);
      await fetchStaff();
    } catch (err: any) {
      console.error("Error al dar de baja:", err);
      await alert({
        title: "Error de conexión",
        message: "No fue posible comunicarse con el servidor",
        variant: "danger",
      });
    }
  };

  // Reactivar usuario
  const handleReactivar = async (member: StaffMember) => {
    const rolLabel =
      member.role === "MECHANIC" || member.role === "MECANICO"
        ? "Mecánico"
        : "Recepción";

    const confirmed = await confirm({
      title: `¿Reactivar acceso a ${member.nombre} ${member.apellido || ""}?`,
      message: `Se restablecerá el acceso activo como ${rolLabel}.`,
      description:
        "El usuario podrá volver a iniciar sesión con sus credenciales y aparecerá disponible nuevamente para la asignación operativa de tareas.",
      confirmText: "Reactivar acceso",
      cancelText: "Cancelar",
      variant: "success",
      icon: "success",
    });

    if (!confirmed) return;

    try {
      const res = await fetch(`/api/staff/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACTIVE" }),
      });

      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "No se pudo reactivar",
          message: data.error || "Ocurrió un error al reactivar el usuario",
          variant: "danger",
        });
        return;
      }

      triggerToast(`Se reactivó el acceso a ${member.nombre} ${member.apellido || ""}`);
      await fetchStaff();
    } catch (err: any) {
      console.error("Error al reactivar:", err);
      await alert({
        title: "Error de conexión",
        message: "No fue posible comunicarse con el servidor",
        variant: "danger",
      });
    }
  };

  // Generar contraseña aleatoria
  const generarPasswordSegura = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
    setShowPassword(true);
  };

  // Crear usuario
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.nombre.trim()) {
      setFormError("El nombre es requerido");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setFormError("Ingresa un correo electrónico válido");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Error al dar de alta el personal");
        return;
      }

      setModalOpen(false);
      setFormData({
        nombre: "",
        apellido: "",
        email: "",
        password: "",
        role: "MECHANIC",
      });
      triggerToast(`Personal ${data.user.nombre} registrado con éxito`);
      await fetchStaff();
    } catch (err: any) {
      console.error("Error creando staff:", err);
      setFormError("Error de conexión al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      {/* Toast Notificación */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900/90 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700/60 flex items-center gap-3 backdrop-blur animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">
                Gestión de Personal y Cuentas
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Personal del Taller
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 max-w-2xl leading-relaxed">
            Administra las cuentas de acceso del taller. Da de alta nuevos miembros del equipo (Mecánicos y Recepción) o dales de baja según las necesidades operativas.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer shrink-0 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Miembro</span>
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Activos</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{counts.activos}</p>
          <span className="text-[10px] text-slate-400">En plantilla operativa</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Mecánicos</span>
            <Wrench className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-600">{counts.mecanicos}</p>
          <span className="text-[10px] text-slate-400">Asignables en taller</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-sky-600 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Recepción</span>
            <ClipboardList className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-sky-600">{counts.recepcion}</p>
          <span className="text-[10px] text-slate-400">Atención e ingreso</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-rose-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">De Baja</span>
            <UserX className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-rose-600">{counts.inactivos}</p>
          <span className="text-[10px] text-slate-400">Acceso revocado</span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setRoleFilter("TODOS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              roleFilter === "TODOS"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todos ({counts.total})
          </button>

          <button
            onClick={() => setRoleFilter("MECHANIC")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              roleFilter === "MECHANIC"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Mecánicos ({counts.mecanicos})</span>
          </button>

          <button
            onClick={() => setRoleFilter("RECEPTION")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              roleFilter === "RECEPTION"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-sky-50 hover:text-sky-700"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Recepción ({counts.recepcion})</span>
          </button>

          <button
            onClick={() => setRoleFilter("INACTIVE")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              roleFilter === "INACTIVE"
                ? "bg-rose-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>De Baja ({counts.inactivos})</span>
          </button>
        </div>

        {/* Input Buscador */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Lista de Personal */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mb-3" />
          <p className="text-xs font-bold text-slate-500">Cargando personal del taller...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No se encontraron miembros de personal</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? "No hay coincidencias con la búsqueda ingresada."
              : roleFilter === "INACTIVE"
              ? "No hay usuarios dados de baja actualmente."
              : "Aún no se ha dado de alta personal con este filtro."}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-xs font-bold text-purple-600 hover:underline"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStaff.map((member) => {
            const isMechanic = member.role === "MECHANIC" || member.role === "MECANICO";
            const isInactive = member.status === "INACTIVE";
            const initials = `${member.nombre.charAt(0)}${member.apellido ? member.apellido.charAt(0) : ""}`.toUpperCase();

            return (
              <div
                key={member.id}
                className={`bg-white rounded-2xl border transition-all p-4 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-sm ${
                  isInactive
                    ? "border-rose-200 bg-rose-50/20 opacity-80"
                    : "border-slate-200/90"
                }`}
              >
                {/* Cabecera de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 border ${
                        isInactive
                          ? "bg-slate-100 text-slate-400 border-slate-200"
                          : isMechanic
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                          : "bg-sky-50 text-sky-700 border-sky-200/70"
                      }`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-extrabold text-sm text-slate-900 truncate">
                          {member.nombre} {member.apellido || ""}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </p>
                    </div>
                  </div>

                  {/* Estado Badge */}
                  <div>
                    {isInactive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        De Baja
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Activo
                      </span>
                    )}
                  </div>
                </div>

                {/* Rol y Detalles */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">Rol Operativo</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                        isMechanic
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-700 border border-sky-500/20"
                      }`}
                    >
                      {isMechanic ? (
                        <>
                          <Wrench className="w-3 h-3" />
                          <span>Mecánico</span>
                        </>
                      ) : (
                        <>
                          <ClipboardList className="w-3 h-3" />
                          <span>Recepción</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Órdenes activas para mecánicos */}
                  {isMechanic && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Órdenes asignadas</span>
                      <span className="font-bold text-slate-700">
                        {member._count?.workOrdersMechanic !== undefined
                          ? `${member._count.workOrdersMechanic} activas`
                          : "–"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Alta en sistema</span>
                    <span>
                      {member.creadoEn
                        ? new Date(member.creadoEn).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "–"}
                    </span>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  {isInactive ? (
                    <button
                      onClick={() => handleReactivar(member)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reactivar Cuenta</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDarDeBaja(member)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Dar de Baja</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ALTA DE PERSONAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">
                    Dar de Alta Miembro de Personal
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Crea una cuenta para Mecánico o Recepción
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Selección de Rol */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Selecciona el Rol *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "MECHANIC" })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.role === "MECHANIC"
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench
                        className={`w-4 h-4 ${
                          formData.role === "MECHANIC" ? "text-emerald-600" : "text-slate-400"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          formData.role === "MECHANIC" ? "text-emerald-900" : "text-slate-700"
                        }`}
                      >
                        Mecánico
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Acceso a Hoja de Ruta, peritajes técnicos y registro de trabajos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: "RECEPTION" })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.role === "RECEPTION"
                        ? "border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList
                        className={`w-4 h-4 ${
                          formData.role === "RECEPTION" ? "text-sky-600" : "text-slate-400"
                        }`}
                      />
                      <span
                        className={`text-xs font-bold ${
                          formData.role === "RECEPTION" ? "text-sky-900" : "text-slate-700"
                        }`}
                      >
                        Recepción
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Admisión de clientes, registro de autos y apertura de órdenes.
                    </p>
                  </button>
                </div>
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej. Lucas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    placeholder="Ej. Gómez"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Correo Electrónico de Acceso *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ejemplo@taller.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Contraseña Inicial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Contraseña Inicial *
                  </label>
                  <button
                    type="button"
                    onClick={generarPasswordSegura}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar aleatoria</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  El miembro podrá ingresar al sistema inmediatamente con este email y contraseña.
                </span>
              </div>

              {/* Botones Acciones */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Dar de Alta</span>
                    </>
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
