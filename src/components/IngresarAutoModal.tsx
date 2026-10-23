"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Plus,
  X,
  Users,
  UserCheck,
  UserPlus,
  Car,
  ShieldAlert,
  PenTool,
  CheckCircle2,
  Check,
  Search,
  FileText,
  Printer,
  Download,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { DamagePin } from "@/types";
import ClientSignaturePad from "@/components/ClientSignaturePad";
import CarDamageBlueprint from "@/components/CarDamageBlueprint";
import {
  generateResguardoDepositoPDF,
  printResguardoDepositoPDF,
  ResguardoDepositoParams,
} from "@/lib/pdf-generator";

// Badge Matrícula Compacto
function ArgentinePlateBadge({ patente }: { patente: string }) {
  const cleanPatente = (patente || "").toUpperCase().trim();
  return (
    <span className="inline-flex items-center px-2 py-0.5 border border-slate-300 rounded-md bg-slate-100 text-slate-900 font-mono font-black text-xs sm:text-sm tracking-wider select-none shrink-0 shadow-2xs">
      {cleanPatente}
    </span>
  );
}

export interface IngresarAutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdOrder: any) => void;
  initialStep?: 1 | 2 | 3 | 4 | 5;
  initialClientId?: string;
  initialVehicleId?: string;
}

const initialOrderFormState = {
  clienteNombre: "",
  clienteApellido: "",
  clienteTelefono: "",
  clienteDni: "",
  clienteEmail: "",
  clienteDireccion: "",
  vehiculoPatente: "",
  vehiculoMarca: "",
  vehiculoModelo: "",
  vehiculoAnio: new Date().getFullYear().toString(),
  vehiculoColor: "",
  vehiculoChasis: "",
  nivelNafta: "1/2",
  kilometraje: "",
  detallesIngreso: "",
  comentariosDuenio: "",
  costoManoDeObra: "0",
  mechanicId: "",
  tuercaSeguridad: false,
  tuercaSeguridadUbicacion: "",
  damagePins: [] as DamagePin[],
  firmaCliente: null as string | null,
};

export default function IngresarAutoModal({
  isOpen,
  onClose,
  onSuccess,
  initialStep = 1,
  initialClientId,
  initialVehicleId,
}: IngresarAutoModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(initialStep);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Datos externos cargados
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [existingVehicles, setExistingVehicles] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Modos de selección / creación
  const [clientMode, setClientMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [vehicleMode, setVehicleMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Buscadores y dropdowns
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);

  // Form State
  const [orderForm, setOrderForm] = useState(initialOrderFormState);

  // Modal de éxito de emisión del resguardo A4
  const [createdOrderSuccessModal, setCreatedOrderSuccessModal] = useState<any | null>(null);

  // Refs para dropdowns flotantes con portal
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientPortalRef = useRef<HTMLDivElement>(null);
  const [clientDropdownPos, setClientDropdownPos] = useState({ top: 0, left: 0, width: 0, bottom: undefined as number | undefined });

  const vehicleDropdownRef = useRef<HTMLDivElement>(null);
  const vehiclePortalRef = useRef<HTMLDivElement>(null);
  const [vehicleDropdownPos, setVehicleDropdownPos] = useState({ top: 0, left: 0, width: 0, bottom: undefined as number | undefined });

  const isMechanic = currentUser?.role === "MECHANIC" || currentUser?.role === "MECANICO";

  // Cargar datos al abrir modal
  const fetchModalData = async () => {
    try {
      const [resClients, resVehicles, resMechanics, resUser] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/vehicles"),
        fetch("/api/mechanics"),
        fetch("/api/auth/me"),
      ]);

      if (resClients.ok) {
        const d = await resClients.json();
        setExistingClients(d.clients || []);
      }
      if (resVehicles.ok) {
        const d = await resVehicles.json();
        setExistingVehicles(d.vehicles || []);
      }
      if (resMechanics.ok) {
        const d = await resMechanics.json();
        setMechanics(d.mechanics || []);
      }
      if (resUser.ok) {
        const d = await resUser.json();
        setCurrentUser(d.user || null);
      }
    } catch (e) {
      console.error("Error al cargar datos en IngresarAutoModal:", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchModalData();
    }
  }, [isOpen]);

  // Inicialización al abrir
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setClientSearchQuery("");
      setClientDropdownOpen(false);
      setVehicleSearchQuery("");
      setVehicleDropdownOpen(false);
      setCreatedOrderSuccessModal(null);

      let chosenStep = initialStep;
      let initClientMode: "EXISTING" | "NEW" = "EXISTING";
      let initVehicleMode: "EXISTING" | "NEW" = "EXISTING";

      if (initialClientId) {
        setSelectedClientId(initialClientId);
        initClientMode = "EXISTING";
      }

      if (initialVehicleId) {
        setSelectedVehicleId(initialVehicleId);
        initVehicleMode = "EXISTING";
        chosenStep = initialStep > 1 ? initialStep : 3;
      }

      setClientMode(initClientMode);
      setVehicleMode(initVehicleMode);
      setStep(chosenStep);

      setOrderForm({
        ...initialOrderFormState,
        mechanicId: isMechanic && currentUser?.id ? currentUser.id : "",
      });

      setTimeout(() => {
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTop = 0;
        }
      }, 0);
    }
  }, [isOpen, initialStep, initialClientId, initialVehicleId]);

  // Si cambia el paso, scrollear al tope
  useEffect(() => {
    if (isOpen && modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [step, isOpen]);

  // Prellenar si hay vehículos o clientes existentes seleccionados
  useEffect(() => {
    if (selectedClientId && existingClients.length > 0) {
      const c = existingClients.find((cl) => cl.id === selectedClientId);
      if (c) {
        setOrderForm((prev) => ({
          ...prev,
          clienteNombre: c.nombre || "",
          clienteApellido: c.apellido || "",
          clienteDni: c.dni || "",
          clienteTelefono: c.telefono || "",
          clienteEmail: c.email || "",
          clienteDireccion: c.direccion || "",
        }));
      }
    }
  }, [selectedClientId, existingClients]);

  useEffect(() => {
    if (selectedVehicleId && existingVehicles.length > 0) {
      const v = existingVehicles.find((veh) => veh.id === selectedVehicleId);
      if (v) {
        setOrderForm((prev) => ({
          ...prev,
          vehiculoPatente: v.patente || "",
          vehiculoMarca: v.marca || "",
          vehiculoModelo: v.modelo || "",
          vehiculoAnio: v.anio ? String(v.anio) : prev.vehiculoAnio,
          vehiculoColor: v.color || "",
          vehiculoChasis: v.nroChasis || "",
        }));
      }
    }
  }, [selectedVehicleId, existingVehicles]);

  // Clientes y Vehículos Filtrados
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return existingClients;
    const q = clientSearchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return existingClients.filter((c: any) => {
      const nombreCompleto = `${c.nombre || ""} ${c.apellido || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const dni = (c.dni || "").toLowerCase();
      const tel = (c.telefono || "").toLowerCase();
      const plateMatch = (c.vehicles || []).some((v: any) => (v.patente || "").toLowerCase().includes(q));
      return nombreCompleto.includes(q) || dni.includes(q) || tel.includes(q) || plateMatch;
    });
  }, [existingClients, clientSearchQuery]);

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return existingClients.find((c) => c.id === selectedClientId) || null;
  }, [selectedClientId, existingClients]);

  const clientVehicles = useMemo(() => {
    if (!selectedClientId) return [];
    return existingVehicles.filter((v: any) => v.clientId === selectedClientId);
  }, [selectedClientId, existingVehicles]);

  const filteredVehicles = useMemo(() => {
    const listToFilter = clientMode === "EXISTING" && selectedClientId ? clientVehicles : existingVehicles;
    if (!vehicleSearchQuery.trim()) return listToFilter;
    const q = vehicleSearchQuery.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return listToFilter.filter((v: any) => {
      const pat = (v.patente || "").toLowerCase();
      const mm = `${v.marca || ""} ${v.modelo || ""}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return pat.includes(q) || mm.includes(q);
    });
  }, [clientMode, selectedClientId, clientVehicles, existingVehicles, vehicleSearchQuery]);

  // Posicionamiento flotante para dropdowns (Portal)
  const updateClientDropdownPos = () => {
    if (clientDropdownRef.current) {
      const rect = clientDropdownRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 250;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownMaxHeight && rect.top > spaceBelow;
      if (openUp) {
        setClientDropdownPos({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          top: 0,
        });
      } else {
        setClientDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          bottom: undefined,
        });
      }
    }
  };

  const updateVehicleDropdownPos = () => {
    if (vehicleDropdownRef.current) {
      const rect = vehicleDropdownRef.current.getBoundingClientRect();
      const dropdownMaxHeight = 250;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < dropdownMaxHeight && rect.top > spaceBelow;
      if (openUp) {
        setVehicleDropdownPos({
          bottom: window.innerHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          top: 0,
        });
      } else {
        setVehicleDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          bottom: undefined,
        });
      }
    }
  };

  useLayoutEffect(() => {
    if (clientDropdownOpen) {
      updateClientDropdownPos();
      window.addEventListener("resize", updateClientDropdownPos);
      window.addEventListener("scroll", updateClientDropdownPos, true);
      return () => {
        window.removeEventListener("resize", updateClientDropdownPos);
        window.removeEventListener("scroll", updateClientDropdownPos, true);
      };
    }
  }, [clientDropdownOpen]);

  useLayoutEffect(() => {
    if (vehicleDropdownOpen) {
      updateVehicleDropdownPos();
      window.addEventListener("resize", updateVehicleDropdownPos);
      window.addEventListener("scroll", updateVehicleDropdownPos, true);
      return () => {
        window.removeEventListener("resize", updateVehicleDropdownPos);
        window.removeEventListener("scroll", updateVehicleDropdownPos, true);
      };
    }
  }, [vehicleDropdownOpen]);

  // Click outside para cerrar dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        clientDropdownRef.current &&
        !clientDropdownRef.current.contains(target) &&
        (!clientPortalRef.current || !clientPortalRef.current.contains(target))
      ) {
        setClientDropdownOpen(false);
      }
      if (
        vehicleDropdownRef.current &&
        !vehicleDropdownRef.current.contains(target) &&
        (!vehiclePortalRef.current || !vehiclePortalRef.current.contains(target))
      ) {
        setVehicleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Verificar si un vehículo tiene una orden activa
  const isOrderActive = (o: any) =>
    o.estado !== "FINALIZADO" &&
    o.estado !== "REPARADO" &&
    o.estado !== "TERMINADO" &&
    o.estado !== "ENTREGADO" &&
    o.estado !== "ARCHIVADO" &&
    o.estado !== "CANCELADO" &&
    o.estado !== "CANCELADA" &&
    o.estado !== "DADA_DE_BAJA";

  const getVehicleActiveOrder = (vehicleId?: string, plate?: string) => {
    if (vehicleId) {
      const v = existingVehicles.find((veh: any) => veh.id === vehicleId);
      if (v?.workOrders) {
        const orderFromVeh = v.workOrders.find((o: any) => isOrderActive(o));
        if (orderFromVeh) return orderFromVeh;
      }
    }

    if (plate) {
      const cleanP = plate.trim().toUpperCase();
      if (!cleanP) return null;
      const vByPlate = existingVehicles.find(
        (veh: any) => veh.patente?.trim().toUpperCase() === cleanP
      );
      if (vByPlate?.workOrders) {
        const orderFromVeh = vByPlate.workOrders.find((o: any) => isOrderActive(o));
        if (orderFromVeh) return orderFromVeh;
      }
    }

    return null;
  };

  const selectedVehicleActiveOrder = useMemo(() => {
    if (!selectedVehicleId) return null;
    return getVehicleActiveOrder(selectedVehicleId);
  }, [selectedVehicleId, existingVehicles]);

  const newPlateActiveOrder = useMemo(() => {
    if (vehicleMode !== "NEW" || !orderForm.vehiculoPatente.trim()) return null;
    return getVehicleActiveOrder(undefined, orderForm.vehiculoPatente);
  }, [vehicleMode, orderForm.vehiculoPatente, existingVehicles]);

  // Validaciones del Wizard
  const validateStep = (currentStep: number): boolean => {
    setFormError(null);
    if (currentStep === 1) {
      if (clientMode === "EXISTING" && !selectedClientId) {
        setFormError("Debes seleccionar un cliente de la lista o pulsar '+ Cargar Nuevo'.");
        return false;
      }
      if (clientMode === "NEW") {
        if (!orderForm.clienteNombre.trim() || !orderForm.clienteDni.trim()) {
          setFormError("Por favor completa al menos el Nombre y DNI/CUIT del nuevo cliente.");
          return false;
        }
      }
    }
    if (currentStep === 2) {
      if (vehicleMode === "EXISTING") {
        if (!selectedVehicleId) {
          setFormError("Debes seleccionar un vehículo del listado o pulsar '+ Cargar Nuevo'.");
          return false;
        }
        const activeOrder = getVehicleActiveOrder(selectedVehicleId);
        if (activeOrder) {
          setFormError(
            `El vehículo seleccionado ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}). Debe finalizarse o entregarse la orden previa antes de un nuevo ingreso.`
          );
          return false;
        }
      }
      if (vehicleMode === "NEW") {
        if (!orderForm.vehiculoPatente.trim() || !orderForm.vehiculoMarca.trim() || !orderForm.vehiculoModelo.trim()) {
          setFormError("Por favor completa Patente, Marca y Modelo del nuevo auto.");
          return false;
        }
        const activeOrder = getVehicleActiveOrder(undefined, orderForm.vehiculoPatente);
        if (activeOrder) {
          setFormError(
            `La patente ${orderForm.vehiculoPatente.trim().toUpperCase()} ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}) en el taller.`
          );
          return false;
        }
      }
    }
    if (currentStep === 3) {
      if (!orderForm.detallesIngreso.trim()) {
        setFormError("Por favor describe el motivo del ingreso o síntomas mecánicos.");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(step)) {
      if (step === 1) {
        if (clientMode === "NEW") {
          setVehicleMode("NEW");
          setSelectedVehicleId("");
        } else if (clientMode === "EXISTING") {
          const clientCars = existingVehicles.filter((v) => v.clientId === selectedClientId);
          if (clientCars.length > 0) {
            setVehicleMode("EXISTING");
            if (clientCars.length === 1 && !selectedVehicleId) {
              setSelectedVehicleId(clientCars[0].id);
            }
          } else {
            setVehicleMode("NEW");
            setSelectedVehicleId("");
          }
        }
      }
      setStep((prev) => Math.min(prev + 1, 5) as 1 | 2 | 3 | 4 | 5);
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    setStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5);
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  };

  // Creación formal de la orden
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    if (clientMode === "EXISTING" && !selectedClientId) {
      setFormError("Por favor selecciona un cliente ya cargado en el sistema o pulsa '+ Cargar Nuevo'.");
      setSubmitting(false);
      return;
    }

    if (clientMode === "NEW" && (!orderForm.clienteNombre.trim() || !orderForm.clienteDni.trim())) {
      setFormError("Por favor completa los datos obligatorios del nuevo cliente (Nombre y DNI/CUIT).");
      setSubmitting(false);
      return;
    }

    if (vehicleMode === "EXISTING") {
      if (!selectedVehicleId) {
        setFormError("Por favor selecciona un vehículo ya registrado en el sistema o pulsa '+ Cargar Nuevo'.");
        setSubmitting(false);
        return;
      }
      const activeOrder = getVehicleActiveOrder(selectedVehicleId);
      if (activeOrder) {
        setFormError(
          `Operación denegada: El vehículo seleccionado ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}).`
        );
        setSubmitting(false);
        return;
      }
    }

    if (vehicleMode === "NEW") {
      if (!orderForm.vehiculoPatente.trim() || !orderForm.vehiculoMarca.trim() || !orderForm.vehiculoModelo.trim()) {
        setFormError("Por favor completa los datos obligatorios del nuevo vehículo (Patente, Marca y Modelo).");
        setSubmitting(false);
        return;
      }
      const activeOrder = getVehicleActiveOrder(undefined, orderForm.vehiculoPatente);
      if (activeOrder) {
        setFormError(
          `Operación denegada: La patente ${orderForm.vehiculoPatente.trim().toUpperCase()} ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}) en el taller.`
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      const checklistDanioPayload = {
        fechaHoraCheckin: new Date().toLocaleString("es-AR"),
        kilometrajeTablero: parseInt(orderForm.kilometraje, 10) || 0,
        nivelCombustible: orderForm.nivelNafta || "1/2",
        comentariosDuenio: orderForm.comentariosDuenio || "",
        damagePins: orderForm.damagePins || [],
        tuercaSeguridadUbicacion: orderForm.tuercaSeguridadUbicacion || "",
        numeroBastidorVin: orderForm.vehiculoChasis || "",
        autorizaViaPublica: true,
        firmaCliente: orderForm.firmaCliente || null,
        fechaFirmaCliente: orderForm.firmaCliente ? new Date().toISOString() : null,
        inventarioCabina: {
          ruedaAuxilio: true,
          criqueYHerramientas: true,
          tuercaSeguridad: Boolean(orderForm.tuercaSeguridad),
          documentacion: true,
          estereoFunciona: true,
          matafuegoVigente: true,
          tapaCombustible: true,
        },
      };

      const payload: any = {
        ...orderForm,
        clienteId: clientMode === "EXISTING" ? selectedClientId : undefined,
        vehicleId: vehicleMode === "EXISTING" ? selectedVehicleId : undefined,
        checklistDanio: checklistDanioPayload,
      };

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Error al crear la orden");
        setSubmitting(false);
        return;
      }

      onSuccess?.(data.order);
      setCreatedOrderSuccessModal(data.order);
    } catch {
      setFormError("Error de comunicación con el servidor");
    } finally {
      setSubmitting(false);
    }
  };

  // Acciones de Resguardo
  const handlePrintResguardoFromOrder = (orderItem: any) => {
    if (!orderItem) return;
    let peritajeData: any = {};
    if (orderItem.checklistDanio) {
      try {
        peritajeData = typeof orderItem.checklistDanio === "string" ? JSON.parse(orderItem.checklistDanio) : orderItem.checklistDanio;
      } catch {}
    }
    const params: ResguardoDepositoParams = {
      numeroOrden: orderItem.numeroOrden,
      vehiculo: {
        marca: orderItem.vehicle?.marca || "",
        modelo: orderItem.vehicle?.modelo || "",
        anio: orderItem.vehicle?.anio,
        patente: orderItem.vehicle?.patente || "",
        color: orderItem.vehicle?.color,
        nroChasis: peritajeData?.numeroBastidorVin || orderItem.vehicle?.nroChasis || "",
      },
      cliente: {
        nombre: orderItem.vehicle?.client?.nombre || "Cliente",
        apellido: orderItem.vehicle?.client?.apellido || "",
        dni: orderItem.vehicle?.client?.dni || "",
        telefono: orderItem.vehicle?.client?.telefono || "",
        direccion: orderItem.vehicle?.client?.direccion || "",
        email: orderItem.vehicle?.client?.email || "",
      },
      peritaje: {
        ...peritajeData,
        kilometrajeTablero: peritajeData?.kilometrajeTablero || orderItem.kilometraje || 0,
        nivelCombustible: peritajeData?.nivelCombustible || orderItem.nivelNafta || "1/2",
      },
      taller: {
        nombre: "POGGI Taller Integral",
        telefono: "656 40 62 86",
        direccion: "San Pío X 13 , Valencia cp 46017",
      },
    };
    printResguardoDepositoPDF(params);
  };

  const handleDownloadResguardoFromOrder = (orderItem: any) => {
    if (!orderItem) return;
    let peritajeData: any = {};
    if (orderItem.checklistDanio) {
      try {
        peritajeData = typeof orderItem.checklistDanio === "string" ? JSON.parse(orderItem.checklistDanio) : orderItem.checklistDanio;
      } catch {}
    }
    const params: ResguardoDepositoParams = {
      numeroOrden: orderItem.numeroOrden,
      vehiculo: {
        marca: orderItem.vehicle?.marca || "",
        modelo: orderItem.vehicle?.modelo || "",
        anio: orderItem.vehicle?.anio,
        patente: orderItem.vehicle?.patente || "",
        color: orderItem.vehicle?.color,
        nroChasis: peritajeData?.numeroBastidorVin || orderItem.vehicle?.nroChasis || "",
      },
      cliente: {
        nombre: orderItem.vehicle?.client?.nombre || "Cliente",
        apellido: orderItem.vehicle?.client?.apellido || "",
        dni: orderItem.vehicle?.client?.dni || "",
        telefono: orderItem.vehicle?.client?.telefono || "",
        direccion: orderItem.vehicle?.client?.direccion || "",
        email: orderItem.vehicle?.client?.email || "",
      },
      peritaje: {
        ...peritajeData,
        kilometrajeTablero: peritajeData?.kilometrajeTablero || orderItem.kilometraje || 0,
        nivelCombustible: peritajeData?.nivelCombustible || orderItem.nivelNafta || "1/2",
      },
      taller: {
        nombre: "POGGI Taller Integral",
        telefono: "656 40 62 86",
        direccion: "San Pío X 13 , Valencia cp 46017",
      },
    };
    generateResguardoDepositoPDF(params);
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl sm:max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[520px] sm:min-h-[580px] max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Encabezado del Modal */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Ingreso de Auto a Taller</h3>
                <p className="text-[11px] text-slate-400 font-medium">Paso {step} de 5</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper Progresivo de 5 Pasos */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-5 py-3 select-none">
            <div className="flex items-center justify-between">
              {[
                { num: 1, title: "Titular", icon: Users },
                { num: 2, title: "Vehículo", icon: Car },
                { num: 3, title: "Inspección", icon: ShieldAlert },
                { num: 4, title: "Firma", icon: PenTool },
                { num: 5, title: "Confirmar", icon: CheckCircle2 },
              ].map((s, idx) => {
                const isActive = step === s.num;
                const isCompleted = step > s.num;

                return (
                  <React.Fragment key={s.num}>
                    <button
                      type="button"
                      onClick={() => {
                        if (s.num < step) {
                          setStep(s.num as 1 | 2 | 3 | 4 | 5);
                          if (modalBodyRef.current) {
                            modalBodyRef.current.scrollTop = 0;
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs font-bold transition-all text-left ${
                        isActive
                          ? "text-sky-600"
                          : isCompleted
                          ? "text-emerald-700 cursor-pointer"
                          : "text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${
                          isActive
                            ? "bg-sky-600 text-white shadow-sm ring-4 ring-sky-100"
                            : isCompleted
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        {isCompleted ? "✓" : s.num}
                      </span>
                      <span className="hidden sm:inline font-bold">{s.title}</span>
                    </button>
                    {idx < 4 && (
                      <div
                        className={`flex-1 mx-1.5 sm:mx-2 h-0.5 rounded-full transition-all ${
                          step > s.num ? "bg-emerald-500" : "bg-slate-200"
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Cuerpo del Formulario */}
          <div ref={modalBodyRef} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* PASO 1: TITULAR */}
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">1. Datos del Titular / Cliente</h4>
                  <p className="text-xs text-slate-500">¿El cliente ya fue registrado previamente o es un cliente nuevo?</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setClientMode("EXISTING")}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-extrabold text-xs transition-all cursor-pointer ${
                      clientMode === "EXISTING"
                        ? "border-sky-600 bg-sky-50 text-sky-900 shadow-2xs ring-2 ring-sky-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <UserCheck className="w-4 h-4 text-sky-600" />
                    <span>Elegir Existente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setClientMode("NEW");
                      setSelectedClientId("");
                      setSelectedVehicleId("");
                      setVehicleMode("NEW");
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-extrabold text-xs transition-all cursor-pointer ${
                      clientMode === "NEW"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Cargar Nuevo</span>
                  </button>
                </div>

                {clientMode === "EXISTING" ? (
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Buscar y seleccionar cliente de la nómina:
                    </label>

                    {/* Buscador Desplegable Flotante */}
                    <div ref={clientDropdownRef} className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por Nombre, DNI, Teléfono o Patente del titular..."
                          value={clientSearchQuery}
                          onChange={(e) => {
                            setClientSearchQuery(e.target.value);
                            updateClientDropdownPos();
                            setClientDropdownOpen(true);
                          }}
                          onFocus={() => {
                            updateClientDropdownPos();
                            setClientDropdownOpen(true);
                          }}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                        {clientSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setClientSearchQuery("");
                              updateClientDropdownPos();
                            }}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown flotante con Portal */}
                      {clientDropdownOpen && typeof document !== "undefined" && createPortal(
                        <div
                          ref={clientPortalRef}
                          style={{
                            position: "fixed",
                            top: clientDropdownPos.bottom ? undefined : clientDropdownPos.top,
                            bottom: clientDropdownPos.bottom ? clientDropdownPos.bottom : undefined,
                            left: clientDropdownPos.left,
                            width: clientDropdownPos.width,
                            zIndex: 99999,
                          }}
                          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-60 overflow-y-auto p-1.5 space-y-1 animate-dropdown-unfold"
                        >
                          {filteredClients.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No se encontraron clientes para &quot;{clientSearchQuery}&quot;
                            </div>
                          ) : (
                            filteredClients.map((c) => {
                              const isSelected = selectedClientId === c.id;
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedClientId(c.id);
                                    setClientSearchQuery("");
                                    setClientDropdownOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-sky-50 text-sky-950 font-bold border border-sky-200"
                                      : "hover:bg-slate-50 text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className="truncate">
                                    <span className="block font-bold text-slate-900 truncate">
                                      {c.nombre} {c.apellido}
                                    </span>
                                    <span className="text-[11px] text-slate-500 block truncate">
                                      DNI: {c.dni || "S/D"} · Tel: {c.telefono || "S/D"}
                                    </span>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2 pl-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200/60">
                                      🚗 {c.vehicles?.length || 0} autos
                                    </span>
                                    {isSelected && <Check className="w-4 h-4 text-sky-600 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>,
                        document.body
                      )}
                    </div>

                    {/* Tarjeta del cliente seleccionado */}
                    {selectedClientId && selectedClient && (
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50/70 to-slate-50 border border-sky-200/80 shadow-2xs space-y-3 animate-dropdown-unfold">
                        <div className="flex items-center justify-between gap-3 border-b border-sky-100/90 pb-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {selectedClient.nombre?.[0] || ""}{selectedClient.apellido?.[0] || ""}
                            </div>
                            <div className="truncate">
                              <span className="font-extrabold text-sm text-slate-900 block truncate">
                                {selectedClient.nombre} {selectedClient.apellido}
                              </span>
                              <span className="text-[11px] text-sky-700 font-medium">
                                Titular seleccionado para la orden
                              </span>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-1 rounded-full shrink-0">
                            <Check className="w-3 h-3 text-sky-600 stroke-[3]" />
                            Seleccionado
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              DNI / CUIT
                            </span>
                            <span className="font-mono font-bold text-slate-800 block truncate mt-0.5">
                              {selectedClient.dni || "No especificado"}
                            </span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Teléfono / WhatsApp
                            </span>
                            <span className="font-medium text-slate-800 block truncate mt-0.5">
                              {selectedClient.telefono || "Sin teléfono"}
                            </span>
                          </div>

                          <div className="bg-white p-2.5 rounded-xl border border-sky-100 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Autos Registrados
                            </span>
                            <span className="font-bold text-sky-950 block truncate mt-0.5">
                              🚗 {clientVehicles.length} {clientVehicles.length === 1 ? "auto registrado" : "autos registrados"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    <span className="text-xs font-bold text-slate-700 block">
                      Completa los datos del nuevo cliente:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Federico"
                          value={orderForm.clienteNombre}
                          onChange={(e) => setOrderForm({ ...orderForm, clienteNombre: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Apellido <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Alvarez"
                          value={orderForm.clienteApellido}
                          onChange={(e) => setOrderForm({ ...orderForm, clienteApellido: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Teléfono / WhatsApp <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          placeholder="Ej: +54 11 5566-7788"
                          value={orderForm.clienteTelefono}
                          onChange={(e) => setOrderForm({ ...orderForm, clienteTelefono: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          CUIL / DNI <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 20-34890123-8 o 34890123"
                          value={orderForm.clienteDni}
                          onChange={(e) => setOrderForm({ ...orderForm, clienteDni: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Dirección / Domicilio
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Av. Corrientes 1234, CABA"
                          value={orderForm.clienteDireccion}
                          onChange={(e) => setOrderForm({ ...orderForm, clienteDireccion: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Email (Correo Electrónico)
                        </label>
                        <input
                          type="email"
                          placeholder="Ej: federico.alvarez@email.com"
                          value={orderForm.clienteEmail}
                          onChange={(e) => setOrderForm({ ...orderForm, clienteEmail: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASO 2: VEHÍCULO */}
            {step === 2 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">2. Datos del Vehículo</h4>
                  <p className="text-xs text-slate-500">
                    {clientMode === "EXISTING" && selectedClient
                      ? `Vehículo de ${selectedClient.nombre} ${selectedClient.apellido} (${clientVehicles.length} registrados)`
                      : "Ingresa los datos del nuevo vehículo"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={clientMode === "NEW" || clientVehicles.length === 0}
                    onClick={() => setVehicleMode("EXISTING")}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-extrabold text-xs transition-all ${
                      vehicleMode === "EXISTING"
                        ? "border-sky-600 bg-sky-50 text-sky-900 shadow-2xs ring-2 ring-sky-500/20 cursor-pointer"
                        : clientMode === "NEW" || clientVehicles.length === 0
                        ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-600 cursor-pointer"
                    }`}
                  >
                    <Car className={`w-4 h-4 ${vehicleMode === "EXISTING" ? "text-sky-600" : "text-slate-400"}`} />
                    <span>Elegir Existente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVehicleMode("NEW");
                      setSelectedVehicleId("");
                    }}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-extrabold text-xs transition-all cursor-pointer ${
                      vehicleMode === "NEW"
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <Plus className={`w-4 h-4 ${vehicleMode === "NEW" ? "text-emerald-600" : "text-slate-400"}`} />
                    <span>Cargar Nuevo</span>
                  </button>
                </div>

                {vehicleMode === "EXISTING" ? (
                  <div className="space-y-3 pt-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Selecciona el vehículo del titular:
                    </label>

                    {/* Buscador Desplegable Flotante */}
                    <div ref={vehicleDropdownRef} className="relative">
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Buscar por Patente, Marca o Modelo..."
                          value={vehicleSearchQuery}
                          onChange={(e) => {
                            setVehicleSearchQuery(e.target.value);
                            updateVehicleDropdownPos();
                            setVehicleDropdownOpen(true);
                          }}
                          onFocus={() => {
                            updateVehicleDropdownPos();
                            setVehicleDropdownOpen(true);
                          }}
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                        />
                        {vehicleSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setVehicleSearchQuery("");
                              updateVehicleDropdownPos();
                            }}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown flotante con Portal */}
                      {vehicleDropdownOpen && typeof document !== "undefined" && createPortal(
                        <div
                          ref={vehiclePortalRef}
                          style={{
                            position: "fixed",
                            top: vehicleDropdownPos.bottom ? undefined : vehicleDropdownPos.top,
                            bottom: vehicleDropdownPos.bottom ? vehicleDropdownPos.bottom : undefined,
                            left: vehicleDropdownPos.left,
                            width: vehicleDropdownPos.width,
                            zIndex: 99999,
                          }}
                          className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-h-60 overflow-y-auto p-1.5 space-y-1 animate-dropdown-unfold"
                        >
                          {filteredVehicles.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400">
                              No se encontraron vehículos disponibles
                            </div>
                          ) : (
                            filteredVehicles.map((v) => {
                              const isSelected = selectedVehicleId === v.id;
                              const activeOrder = getVehicleActiveOrder(v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedVehicleId(v.id);
                                    setVehicleSearchQuery("");
                                    setVehicleDropdownOpen(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-sky-50 text-sky-950 font-bold border border-sky-200"
                                      : "hover:bg-slate-50 text-slate-700 font-medium"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <ArgentinePlateBadge patente={v.patente} />
                                    <span className="font-extrabold text-slate-900 truncate">
                                      {v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ""}
                                    </span>
                                  </div>
                                  <div className="shrink-0 flex items-center gap-2 pl-2">
                                    {activeOrder ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                        En Taller (#{activeOrder.numeroOrden})
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Disponible
                                      </span>
                                    )}
                                    {isSelected && <Check className="w-4 h-4 text-sky-600 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>,
                        document.body
                      )}
                    </div>

                    {/* Tarjeta del vehículo seleccionado */}
                    {selectedVehicleId && (() => {
                      const vehicle = existingVehicles.find((v) => v.id === selectedVehicleId);
                      if (!vehicle) return null;

                      return (
                        <div className="space-y-3 animate-dropdown-unfold">
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <ArgentinePlateBadge patente={vehicle.patente} />
                                <div className="truncate">
                                  <span className="font-extrabold text-sm text-slate-900 block truncate">
                                    {vehicle.marca} {vehicle.modelo} {vehicle.anio ? `(${vehicle.anio})` : ""}
                                  </span>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Vehículo a ingresar al taller
                                  </span>
                                </div>
                              </div>
                              {selectedVehicleActiveOrder ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full shrink-0">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  En Taller (#{selectedVehicleActiveOrder.numeroOrden})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                  Seleccionado
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Patente
                                </span>
                                <span className="font-mono font-bold text-slate-900 block truncate mt-0.5">
                                  {vehicle.patente}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Año / Color
                                </span>
                                <span className="font-medium text-slate-800 block truncate mt-0.5">
                                  {vehicle.anio || "S/A"} {vehicle.color ? `· ${vehicle.color}` : ""}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Nº Bastidor (VIN)
                                </span>
                                <input
                                  type="text"
                                  placeholder="S/D"
                                  value={orderForm.vehiculoChasis}
                                  onChange={(e) => setOrderForm({ ...orderForm, vehiculoChasis: e.target.value.toUpperCase() })}
                                  className="w-full mt-0.5 p-1 font-mono font-bold text-[11px] text-slate-800 border border-slate-200 rounded-md uppercase focus:ring-1 focus:ring-sky-500 focus:outline-none"
                                />
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Titular Asignado
                                </span>
                                <span className="font-medium text-slate-800 block truncate mt-0.5">
                                  {selectedClient ? `${selectedClient.nombre} ${selectedClient.apellido}` : "Asignado"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 block">
                        Datos del nuevo vehículo {selectedClient ? `para ${selectedClient.nombre} ${selectedClient.apellido}` : ""}:
                      </span>
                      {clientMode === "EXISTING" && clientVehicles.length === 0 && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                          Titular sin autos previos
                        </span>
                      )}
                    </div>
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Patente *</label>
                          <input
                            type="text"
                            placeholder="Ej: AF 142 XY"
                            value={orderForm.vehiculoPatente}
                            onChange={(e) => setOrderForm({ ...orderForm, vehiculoPatente: e.target.value.toUpperCase() })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 uppercase font-mono font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Marca *</label>
                          <input
                            type="text"
                            placeholder="Ej: Ford"
                            value={orderForm.vehiculoMarca}
                            onChange={(e) => setOrderForm({ ...orderForm, vehiculoMarca: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Modelo *</label>
                          <input
                            type="text"
                            placeholder="Ej: Focus"
                            value={orderForm.vehiculoModelo}
                            onChange={(e) => setOrderForm({ ...orderForm, vehiculoModelo: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs"
                          />
                        </div>
                      </div>

                      {newPlateActiveOrder && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Patente con orden activa: </span>
                            <span>
                              La patente {orderForm.vehiculoPatente} ya posee la <strong>Orden activa #{newPlateActiveOrder.numeroOrden}</strong> ({newPlateActiveOrder.estado}) en el taller. Debe finalizarse o entregarse la orden actual antes de poder reingresar este vehículo.
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Año de Fabricación</label>
                          <input
                            type="number"
                            placeholder="2022"
                            value={orderForm.vehiculoAnio}
                            onChange={(e) => setOrderForm({ ...orderForm, vehiculoAnio: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Color</label>
                          <input
                            type="text"
                            placeholder="Ej: Gris Plata"
                            value={orderForm.vehiculoColor}
                            onChange={(e) => setOrderForm({ ...orderForm, vehiculoColor: e.target.value })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 block mb-1">Nº Bastidor (VIN)</label>
                          <input
                            type="text"
                            placeholder="Ej: 8AFZZZ..."
                            value={orderForm.vehiculoChasis}
                            onChange={(e) => setOrderForm({ ...orderForm, vehiculoChasis: e.target.value.toUpperCase() })}
                            className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold text-xs uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: ESTADO, MOTIVO Y PERITAJE INICIAL */}
            {step === 3 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">3. Motivo de Ingreso y Peritaje Previo</h4>
                  <p className="text-xs text-slate-500">Registra el motivo de consulta del cliente y el estado visual al ingresar.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Motivo del Ingreso o Síntomas Mecánicos Reportados *
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: Service de 50.000 km, ruido en tren delantero y chequeo de pérdida de líquido refrigerante..."
                    value={orderForm.detallesIngreso}
                    onChange={(e) => setOrderForm({ ...orderForm, detallesIngreso: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Nivel de Nafta</label>
                    <select
                      value={orderForm.nivelNafta}
                      onChange={(e) => setOrderForm({ ...orderForm, nivelNafta: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                    >
                      <option value="RESERVA">Reserva (Muy bajo)</option>
                      <option value="1/4">1/4 de tanque</option>
                      <option value="1/2">1/2 tanque</option>
                      <option value="3/4">3/4 de tanque</option>
                      <option value="LLENO">Tanque Lleno</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Kilometraje Actual</label>
                    <input
                      type="number"
                      placeholder="Ej: 54300"
                      value={orderForm.kilometraje}
                      onChange={(e) => setOrderForm({ ...orderForm, kilometraje: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tuerca Antirrobo */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={orderForm.tuercaSeguridad}
                        onChange={(e) => setOrderForm({ ...orderForm, tuercaSeguridad: e.target.checked })}
                        className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>¿El auto tiene tuerca antirrobo de seguridad para ruedas?</span>
                    </label>
                  </div>
                  {orderForm.tuercaSeguridad && (
                    <div>
                      <input
                        type="text"
                        placeholder="¿Dónde la dejó el cliente? Ej: Guantera, bajo alfombra del baúl, etc."
                        value={orderForm.tuercaSeguridadUbicacion}
                        onChange={(e) => setOrderForm({ ...orderForm, tuercaSeguridadUbicacion: e.target.value })}
                        className="w-full p-2 rounded-lg border border-slate-300 text-xs font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Comentarios del dueño sobre daños previos */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Comentarios del Cliente sobre Golpes / Rayones Previos
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ej: El cliente declara que el auto ya tenía un raspón en paragolpe trasero izquierdo..."
                    value={orderForm.comentariosDuenio}
                    onChange={(e) => setOrderForm({ ...orderForm, comentariosDuenio: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                {/* Croquis de Carrocería */}
                <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Croquis Gráfico de Daños Preexistentes (Opcional)
                    </span>
                    {orderForm.damagePins.length > 0 && (
                      <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        {orderForm.damagePins.length} detalle{orderForm.damagePins.length > 1 ? "s" : ""} marcado{orderForm.damagePins.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <CarDamageBlueprint
                    pins={orderForm.damagePins}
                    onChange={(pins) => setOrderForm({ ...orderForm, damagePins: pins })}
                  />
                </div>
              </div>
            )}

            {/* PASO 4: FIRMA DIGITAL DEL CLIENTE */}
            {step === 4 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">4. Firma del Cliente en Tablet</h4>
                  <p className="text-xs text-slate-500">
                    El cliente rubrica el ingreso y autoriza la guarda del coche y el diagnóstico inicial.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Rúbrica Táctil del Titular</span>
                    <span className={`text-[11px] font-bold ${orderForm.firmaCliente ? "text-emerald-600" : "text-slate-400"}`}>
                      {orderForm.firmaCliente ? "✓ Firma registrada correctamente" : "Firma requerida en pantalla"}
                    </span>
                  </div>

                  <ClientSignaturePad
                    value={orderForm.firmaCliente}
                    onChange={(sig) => setOrderForm({ ...orderForm, firmaCliente: sig })}
                  />
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs">
                  <span className="font-bold">Aviso legal: </span>
                  <span>
                    La firma digital capturada se insertará automáticamente en el <strong>Resguardo de Depósito Oficial (A4)</strong> emitido al finalizar el ingreso.
                  </span>
                </div>
              </div>
            )}

            {/* PASO 5: CONFIRMACIÓN Y ASIGNACIÓN */}
            {step === 5 && (
              <div className="space-y-4 animate-in fade-in">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">5. Confirmación y Asignación</h4>
                  <p className="text-xs text-slate-500">Revisa los datos antes de ingresar formalmente el auto al taller.</p>
                </div>

                {/* Asignación de mecánico si es admin / recepcionista */}
                {!isMechanic && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Mecánico Asignado Responsable
                    </label>
                    <select
                      value={orderForm.mechanicId}
                      onChange={(e) => setOrderForm({ ...orderForm, mechanicId: e.target.value })}
                      className="w-full p-3 rounded-xl border border-slate-300 font-medium text-xs bg-white text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Sin asignar (dejar en espera para asignar más tarde) --</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          🔧 {m.nombre} {m.apellido || ""} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Resumen Final */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs shadow-2xs">
                  <div className="bg-slate-100/90 px-3.5 py-2 font-extrabold text-slate-700 text-[11px] uppercase tracking-wider flex items-center justify-between border-b border-slate-200">
                    <span>Resumen de la Orden y Resguardo</span>
                    <span className="text-emerald-700 font-bold normal-case">Listo para ingresar</span>
                  </div>
                  <div className="p-3.5 space-y-3 bg-white divide-y divide-slate-100">
                    {/* Cliente */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Titular</span>
                        <span className="font-extrabold text-slate-900 text-xs">
                          {clientMode === "EXISTING"
                            ? `${selectedClient?.nombre || ""} ${selectedClient?.apellido || ""}`
                            : `${orderForm.clienteNombre} ${orderForm.clienteApellido}`}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                          <span>DNI: <strong className="font-mono text-slate-700">{clientMode === "EXISTING" ? selectedClient?.dni : orderForm.clienteDni || "S/D"}</strong></span>
                          <span>Tel: <strong className="text-slate-700">{clientMode === "EXISTING" ? selectedClient?.telefono : orderForm.clienteTelefono || "S/D"}</strong></span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0">
                        {clientMode === "EXISTING" ? "Cliente Registrado" : "Nuevo Cliente"}
                      </span>
                    </div>

                    {/* Auto */}
                    <div className="pt-2 flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehículo</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <ArgentinePlateBadge
                            patente={
                              vehicleMode === "EXISTING"
                                ? existingVehicles.find((v) => v.id === selectedVehicleId)?.patente || "---"
                                : orderForm.vehiculoPatente || "---"
                            }
                          />
                          <span className="font-extrabold text-slate-900 text-xs">
                            {vehicleMode === "EXISTING"
                              ? `${existingVehicles.find((v) => v.id === selectedVehicleId)?.marca || ""} ${existingVehicles.find((v) => v.id === selectedVehicleId)?.modelo || ""}`
                              : `${orderForm.vehiculoMarca} ${orderForm.vehiculoModelo}`}
                          </span>
                          {orderForm.vehiculoChasis && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              VIN: {orderForm.vehiculoChasis}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {vehicleMode === "EXISTING" ? "Auto Registrado" : "Nuevo Auto"}
                      </span>
                    </div>

                    {/* Motivo */}
                    <div className="pt-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Motivo</span>
                      <p className="text-slate-700 font-medium mt-0.5">{orderForm.detallesIngreso || "Sin motivo especificado"}</p>
                    </div>

                    {/* Firma */}
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Firma en Tablet</span>
                      {orderForm.firmaCliente ? (
                        <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Rubricada digitalmente por el cliente
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">
                          Sin firma digital (firmará copia física)
                        </span>
                      )}
                    </div>

                    {/* Conflicto de vehículo activo */}
                    {(selectedVehicleActiveOrder || newPlateActiveOrder) && (
                      <div className="pt-2">
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="font-semibold">
                            Operación bloqueada: Este vehículo ya cuenta con la Orden activa #{
                              (selectedVehicleActiveOrder || newPlateActiveOrder)?.numeroOrden
                            } ({(selectedVehicleActiveOrder || newPlateActiveOrder)?.estado}).
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botones de Navegación del Wizard */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <span>⬅ Anterior</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer"
              >
                <span>Siguiente Paso</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={submitting || Boolean(selectedVehicleActiveOrder || newPlateActiveOrder)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? "Creando Orden..." : "Confirmar e Ingresar Auto"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Éxito de Ingreso: Impresión y Descarga del Resguardo de Depósito A4 */}
      {createdOrderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header con gradiente esmeralda */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white text-center relative">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-black tracking-tight">¡Vehículo Ingresado con Éxito!</h3>
              <p className="text-xs text-emerald-100 font-medium mt-1">
                La Orden #{createdOrderSuccessModal.numeroOrden} ha sido creada y el auto quedó formalmente ingresado al taller.
              </p>
            </div>

            {/* Ficha Resumen */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vehículo:</span>
                  <ArgentinePlateBadge patente={createdOrderSuccessModal.vehicle?.patente || "---"} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Modelo:</span>
                  <span className="font-extrabold text-slate-900">
                    {createdOrderSuccessModal.vehicle?.marca} {createdOrderSuccessModal.vehicle?.modelo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Titular:</span>
                  <span className="font-extrabold text-slate-900">
                    {createdOrderSuccessModal.vehicle?.client?.nombre} {createdOrderSuccessModal.vehicle?.client?.apellido || ""}
                  </span>
                </div>
                {createdOrderSuccessModal.vehicle?.client?.telefono && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Teléfono:</span>
                    <span className="font-mono text-slate-800">{createdOrderSuccessModal.vehicle?.client?.telefono}</span>
                  </div>
                )}
              </div>

              {/* Mensaje de Resguardo para el Cliente */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Copia impresa para el cliente (Al momento de dejar el auto)</span>
                </p>
                <p className="text-amber-800 leading-snug">
                  Imprime el <strong>Resguardo de Depósito (A4)</strong> para que el cliente se lleve una copia firmada con el estado del coche y la autorización de guarda.
                </p>
              </div>

              {/* Botones de Acción Inmediata: Imprimir y Descargar */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => handlePrintResguardoFromOrder(createdOrderSuccessModal)}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Printer className="w-5 h-5 text-emerald-400" />
                  <span>Imprimir Resguardo de Depósito (A4)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadResguardoFromOrder(createdOrderSuccessModal)}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    <span>Descargar PDF</span>
                  </button>

                  <Link
                    href={`/app/ordenes/${createdOrderSuccessModal.id}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs border border-sky-200 shadow-2xs transition-colors"
                  >
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-4 h-4 text-sky-600" />
                  </Link>
                </div>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setCreatedOrderSuccessModal(null);
                    onClose();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer transition-colors"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
