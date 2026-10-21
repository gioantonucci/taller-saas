"use client";

import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ClipboardList,
  Search,
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  RefreshCw,
  MessageCircle,
  X,
  User,
  Users,
  Car,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  UserCheck,
  UserPlus,
  Eye,
  AlertTriangle,
  Lock,
  PenTool,
  Printer,
  Download,
  FileText,
  PackageCheck,
  Ban,
} from "lucide-react";
import { getStatusInfo } from "@/lib/order-status";
import ConfirmDeliveryModal from "@/components/ConfirmDeliveryModal";
import PeritajeIngresoModal from "@/components/PeritajeIngresoModal";
import ClientSignaturePad from "@/components/ClientSignaturePad";
import CarDamageBlueprint from "@/components/CarDamageBlueprint";
import { DamagePin } from "@/types";
import {
  generateResguardoDepositoPDF,
  printResguardoDepositoPDF,
  ResguardoDepositoParams,
} from "@/lib/pdf-generator";
import { useAppDialog } from "@/components/AppDialog";

// Badge Matrícula Compacto pero legible y de tamaño táctil
function ArgentinePlateBadge({ patente }: { patente: string }) {
  const cleanPatente = patente.toUpperCase().trim();
  return (
    <span className="inline-flex items-center px-2 py-0.5 border border-slate-300 rounded-md bg-slate-100 text-slate-900 font-mono font-black text-xs sm:text-sm tracking-wider select-none shrink-0 shadow-2xs">
      {cleanPatente}
    </span>
  );
}

export default function OrdenesPage() {
  const { alert, confirm } = useAppDialog();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("TODOS");
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [notifiedOrders, setNotifiedOrders] = useState<Record<string, boolean>>({});
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [deliveredSuccessMsg, setDeliveredSuccessMsg] = useState<string | null>(null);
  const [orderToDeliver, setOrderToDeliver] = useState<any | null>(null);

  // Usuario actual logueado
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Error al obtener usuario:", err);
    }
  };

  const isMechanic = currentUser?.role === "MECHANIC" || currentUser?.role === "MECANICO";

  // Clientes y Vehículos precargados para selección
  const [existingClients, setExistingClients] = useState<any[]>([]);
  const [existingVehicles, setExistingVehicles] = useState<any[]>([]);
  const [clientMode, setClientMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [vehicleMode, setVehicleMode] = useState<"EXISTING" | "NEW">("EXISTING");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Buscador interactivo en selección de Cliente y Vehículo
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const deliveredNumber = params.get("delivered");
      if (deliveredNumber) {
        setDeliveredSuccessMsg(
          `¡Vehículo de la Orden #${deliveredNumber} entregado al cliente y orden archivada con éxito!`
        );
        setTimeout(() => setDeliveredSuccessMsg(null), 6000);
        window.history.replaceState({}, "", "/app/ordenes");
      }
    }
  }, []);

  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef<HTMLDivElement>(null);
  const clientPortalRef = useRef<HTMLDivElement>(null);
  const [clientDropdownPos, setClientDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const vehicleDropdownRef = useRef<HTMLDivElement>(null);
  const vehiclePortalRef = useRef<HTMLDivElement>(null);
  const [vehicleDropdownPos, setVehicleDropdownPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

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
        });
      } else {
        setClientDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  };

  const openClientDropdown = () => {
    updateClientDropdownPos();
    setClientDropdownOpen(true);
  };

  const toggleClientDropdown = () => {
    if (!clientDropdownOpen) {
      updateClientDropdownPos();
      setClientDropdownOpen(true);
    } else {
      setClientDropdownOpen(false);
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
        });
      } else {
        setVehicleDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  };

  const openVehicleDropdown = () => {
    updateVehicleDropdownPos();
    setVehicleDropdownOpen(true);
  };

  const toggleVehicleDropdown = () => {
    if (!vehicleDropdownOpen) {
      updateVehicleDropdownPos();
      setVehicleDropdownOpen(true);
    } else {
      setVehicleDropdownOpen(false);
    }
  };

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

  // Modal para Consulta Local de Peritaje Realizado (Solo Lectura)
  const [peritajeModalOrder, setPeritajeModalOrder] = useState<any | null>(null);

  const isPeritajeRealizadoParaOrden = (o: any) => {
    if (!o) return false;
    if (
      o.estado === "EN_REPARACION" ||
      o.estado === "EN_CURSO" ||
      o.estado === "FINALIZADO" ||
      o.estado === "ENTREGADO" ||
      o.estado === "TERMINADO" ||
      o.estado === "PERITADO"
    ) {
      return true;
    }
    if (!o.checklistDanio) return false;
    try {
      const parsed = typeof o.checklistDanio === "string" ? JSON.parse(o.checklistDanio) : o.checklistDanio;
      return Boolean(
        parsed &&
          (parsed.fechaHoraPeritaje ||
            parsed.estadoPeritaje === "COMPLETADO" ||
            parsed.cerrado === true ||
            (parsed.damagePins && parsed.damagePins.length > 0))
      );
    } catch {
      return false;
    }
  };

  // Ayudantes para órdenes canceladas / dadas de baja
  const isCancelledOrder = (o: any) => {
    return Boolean(
      o &&
      (o.estado === "CANCELADO" ||
        o.estado === "CANCELADA" ||
        o.estado === "DADA_DE_BAJA" ||
        Boolean(o.motivoCancelacion))
    );
  };

  const getMotivoCancelacion = (o: any) => {
    if (!o) return "";
    if (o.motivoCancelacion) return o.motivoCancelacion;
    if (o.checklistDanio) {
      try {
        const parsed =
          typeof o.checklistDanio === "string"
            ? JSON.parse(o.checklistDanio)
            : o.checklistDanio;
        return parsed?.motivoCancelacion || "";
      } catch {}
    }
    return "";
  };



  // Modal para Nueva Orden Rápida Progresivo (5 Pasos: Titular, Vehículo, Inspección, Firma Tablet, Confirmación)
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOrderSuccess, setCreatedOrderSuccess] = useState<any | null>(null);
  const [createdOrderSuccessModal, setCreatedOrderSuccessModal] = useState<any | null>(null);

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

  const [orderForm, setOrderForm] = useState(initialOrderFormState);

  const handleOpenModal = () => {
    setStep(1);
    setFormError(null);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    setVehicleSearchQuery("");
    setVehicleDropdownOpen(false);
    setOrderForm({
      ...initialOrderFormState,
      mechanicId: isMechanic && currentUser?.id ? currentUser.id : "",
    });
    setModalOpen(true);
  };

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
        telefono: "658 40 62 86",
        direccion: "San Pio X 13, Valencia cp 46017",
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
        telefono: "658 40 62 86",
        direccion: "San Pio X 13, Valencia cp 46017",
      },
    };
    generateResguardoDepositoPDF(params);
  };

  // Helper para verificar si un vehículo ya posee una orden activa (en peritaje o en reparación)
  const getVehicleActiveOrder = (vehicleId?: string, plate?: string) => {
    if (vehicleId) {
      const orderFromOrders = orders.find(
        (o: any) =>
          o.vehicleId === vehicleId &&
          o.estado !== "ENTREGADO" &&
          o.estado !== "ARCHIVADO"
      );
      if (orderFromOrders) return orderFromOrders;

      const v = existingVehicles.find((veh: any) => veh.id === vehicleId);
      if (v?.workOrders) {
        const orderFromVeh = v.workOrders.find(
          (o: any) => o.estado !== "ENTREGADO" && o.estado !== "ARCHIVADO"
        );
        if (orderFromVeh) return orderFromVeh;
      }
    }

    if (plate) {
      const cleanP = plate.trim().toUpperCase();
      if (!cleanP) return null;
      const orderFromPlate = orders.find(
        (o: any) =>
          o.vehicle?.patente?.trim().toUpperCase() === cleanP &&
          o.estado !== "ENTREGADO" &&
          o.estado !== "ARCHIVADO"
      );
      if (orderFromPlate) return orderFromPlate;

      const vByPlate = existingVehicles.find(
        (veh: any) => veh.patente?.trim().toUpperCase() === cleanP
      );
      if (vByPlate?.workOrders) {
        const orderFromVeh = vByPlate.workOrders.find(
          (o: any) => o.estado !== "ENTREGADO" && o.estado !== "ARCHIVADO"
        );
        if (orderFromVeh) return orderFromVeh;
      }
    }

    return null;
  };

  const selectedVehicleActiveOrder = useMemo(() => {
    if (!selectedVehicleId) return null;
    return getVehicleActiveOrder(selectedVehicleId);
  }, [selectedVehicleId, orders, existingVehicles]);

  const newPlateActiveOrder = useMemo(() => {
    if (vehicleMode !== "NEW" || !orderForm.vehiculoPatente.trim()) return null;
    return getVehicleActiveOrder(undefined, orderForm.vehiculoPatente);
  }, [vehicleMode, orderForm.vehiculoPatente, orders, existingVehicles]);

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
            `El vehículo seleccionado ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}). No puede ingresar dos veces simultáneamente. Debe entregarse y archivarse la orden actual antes de habilitar un nuevo ingreso.`
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
            `La patente ${orderForm.vehiculoPatente.trim().toUpperCase()} ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}) en el taller. No puede ingresar dos veces simultáneamente.`
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
    // Paso 4: Firma del Cliente en Tablet (opcional o recomendada)
    if (currentStep === 4) {
      // Avanza al resumen y confirmación
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
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    setStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5);
  };

  const fetchMechanics = async () => {
    try {
      const res = await fetch("/api/mechanics");
      if (res.ok) {
        const data = await res.json();
        setMechanics(data.mechanics || []);
      }
    } catch (err) {
      console.error("Error al cargar mecánicos:", err);
    }
  };

  const fetchClientsAndVehicles = async () => {
    try {
      const [resC, resV] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/vehicles"),
      ]);
      if (resC.ok) {
        const dataC = await resC.json();
        const clientsList = dataC.clients || [];
        setExistingClients(clientsList);
        if (clientsList.length === 0) setClientMode("NEW");
      }
      if (resV.ok) {
        const dataV = await resV.json();
        const vehiclesList = dataV.vehicles || [];
        setExistingVehicles(vehiclesList);
        if (vehiclesList.length === 0) setVehicleMode("NEW");
      }
    } catch (err) {
      console.error("Error al cargar clientes y vehículos:", err);
    }
  };

  const fetchOrders = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/work-orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Error cargando órdenes:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMechanics();
    fetchClientsAndVehicles();
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      fetchClientsAndVehicles();
    }
  }, [modalOpen]);

  const handleNotifyClient = async (orden: any) => {
    const cleanPhone = orden.vehicle?.client?.telefono?.replace(/\D/g, "") || "";
    const car = `${orden.vehicle?.marca || ""} ${orden.vehicle?.modelo || ""} (${orden.vehicle?.patente || ""})`;
    const text = `¡Hola ${orden.vehicle?.client?.nombre || "estimado/a"}! Te avisamos desde POGGI Taller Integral que tu vehículo ${car} correspondiente a la Orden #${orden.numeroOrden} ya se encuentra terminado y listo para retirar. ¡Te esperamos!`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");

    setNotifiedOrders((prev) => ({ ...prev, [orden.id]: true }));

    try {
      await fetch(`/api/work-orders/${orden.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avisoCliente: true, canal: "WhatsApp" }),
      });
    } catch (e) {
      console.error("Error registrando aviso:", e);
    }
  };

  const handleMarkAsDelivered = async (orden: any) => {
    setOrderToDeliver(orden);
  };

  const handleConfirmDeliver = async () => {
    if (!orderToDeliver) return;
    setDeliveringOrderId(orderToDeliver.id);
    try {
      const res = await fetch(`/api/work-orders/${orderToDeliver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "ENTREGADO" }),
      });
      const data = await res.json();
      if (!res.ok) {
        await alert({
          title: "Error al marcar como entregado",
          message: data.error || "No se pudo marcar como entregado",
          variant: "danger",
        });
        return;
      }
      setDeliveredSuccessMsg(
        `¡Orden #${orderToDeliver.numeroOrden} (${orderToDeliver.vehicle?.patente}) entregada y archivada con éxito!`
      );
      setTimeout(() => setDeliveredSuccessMsg(null), 5000);
      setOrderToDeliver(null);
      fetchOrders(true);
    } catch (err) {
      console.error("Error al marcar como entregado:", err);
      await alert({
        title: "Error de conexión",
        message: "No se pudo conectar con el servidor al marcar como entregado.",
        variant: "danger",
      });
    } finally {
      setDeliveringOrderId(null);
    }
  };

  const selectedClient = useMemo(() => {
    return existingClients.find((c) => c.id === selectedClientId) || null;
  }, [existingClients, selectedClientId]);

  const clientVehicles: any[] = useMemo(() => {
    if (!selectedClientId) return [];
    const matched = existingVehicles.filter((v: any) => v.clientId === selectedClientId);
    if (matched.length > 0) return matched;
    const c = existingClients.find((cl: any) => cl.id === selectedClientId);
    return c?.vehicles || [];
  }, [existingVehicles, existingClients, selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return existingClients;
    const q = clientSearchQuery.toLowerCase().trim();
    return existingClients.filter((c: any) => {
      const nombre = (c.nombre || "").toLowerCase();
      const apellido = (c.apellido || "").toLowerCase();
      const fullName = `${nombre} ${apellido}`;
      const dni = (c.dni || "").toLowerCase();
      const telefono = (c.telefono || "").toLowerCase();
      return (
        nombre.includes(q) ||
        apellido.includes(q) ||
        fullName.includes(q) ||
        dni.includes(q) ||
        telefono.includes(q)
      );
    });
  }, [existingClients, clientSearchQuery]);

  const filteredClientVehicles = useMemo(() => {
    if (!vehicleSearchQuery.trim()) return clientVehicles;
    const q = vehicleSearchQuery.toLowerCase().trim();
    return clientVehicles.filter((v: any) => {
      const patente = (v.patente || "").toLowerCase();
      const marca = (v.marca || "").toLowerCase();
      const modelo = (v.modelo || "").toLowerCase();
      const full = `${marca} ${modelo} ${patente}`.toLowerCase();
      return patente.includes(q) || marca.includes(q) || modelo.includes(q) || full.includes(q);
    });
  }, [clientVehicles, vehicleSearchQuery]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedVehicleId(""); // Resetear auto seleccionado al cambiar titular
    if (!clientId) return;
    const clientObj = existingClients.find((cl: any) => cl.id === clientId);
    if (clientObj) {
      setOrderForm((prev) => ({
        ...prev,
        clienteNombre: clientObj.nombre,
        clienteApellido: clientObj.apellido || "",
        clienteDni: clientObj.dni || "",
        clienteTelefono: clientObj.telefono || "",
        clienteEmail: clientObj.email || "",
        clienteDireccion: clientObj.direccion || "",
      }));
    }
    let clientCars = existingVehicles.filter((v: any) => v.clientId === clientId);
    if (clientCars.length === 0) {
      clientCars = clientObj?.vehicles || [];
    }
    if (clientCars.length === 1) {
      setSelectedVehicleId(clientCars[0].id);
      setVehicleMode("EXISTING");
      setOrderForm((prev) => ({
        ...prev,
        vehiculoPatente: clientCars[0].patente,
        vehiculoMarca: clientCars[0].marca,
        vehiculoModelo: clientCars[0].modelo,
        vehiculoAnio: clientCars[0].anio ? String(clientCars[0].anio) : prev.vehiculoAnio,
        vehiculoColor: clientCars[0].color || prev.vehiculoColor,
        vehiculoChasis: clientCars[0].nroChasis || prev.vehiculoChasis,
      }));
    } else if (clientCars.length === 0) {
      setVehicleMode("NEW");
    } else {
      setVehicleMode("EXISTING");
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vObj = existingVehicles.find((v: any) => v.id === vehicleId) || clientVehicles.find((v: any) => v.id === vehicleId);
    if (vObj) {
      setOrderForm((prev) => ({
        ...prev,
        vehiculoPatente: vObj.patente,
        vehiculoMarca: vObj.marca,
        vehiculoModelo: vObj.modelo,
        vehiculoAnio: vObj.anio ? String(vObj.anio) : prev.vehiculoAnio,
        vehiculoColor: vObj.color || prev.vehiculoColor,
        vehiculoChasis: vObj.nroChasis || prev.vehiculoChasis,
      }));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    // Validaciones según modo de cliente
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

    // Validaciones según modo de vehículo
    if (vehicleMode === "EXISTING") {
      if (!selectedVehicleId) {
        setFormError("Por favor selecciona un vehículo ya registrado en el sistema o pulsa '+ Cargar Nuevo'.");
        setSubmitting(false);
        return;
      }
      const activeOrder = getVehicleActiveOrder(selectedVehicleId);
      if (activeOrder) {
        setFormError(
          `Operación denegada: El vehículo seleccionado ya cuenta con la Orden activa #${activeOrder.numeroOrden} (${activeOrder.estado}). No puede ingresar dos veces al taller simultáneamente.`
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

      setModalOpen(false);
      setCreatedOrderSuccess(data.order);
      setCreatedOrderSuccessModal(data.order);
      setTimeout(() => setCreatedOrderSuccess(null), 8000);

      setSelectedClientId("");
      setSelectedVehicleId("");
      setOrderForm({
        ...initialOrderFormState,
        mechanicId: isMechanic && currentUser?.id ? currentUser.id : "",
      });

      fetchOrders(true);
      fetchClientsAndVehicles();
    } catch {
      setFormError("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  // Contadores para pestañas rápidas
  const counts = useMemo(() => {
    const entregados = orders.filter(
      (o) =>
        o.estado === "ENTREGADO" ||
        o.estado === "ARCHIVADO" ||
        o.estado === "CANCELADO" ||
        o.estado === "CANCELADA" ||
        o.estado === "DADA_DE_BAJA"
    ).length;
    const activos = orders.filter(
      (o) =>
        o.estado !== "ENTREGADO" &&
        o.estado !== "ARCHIVADO" &&
        o.estado !== "CANCELADO" &&
        o.estado !== "CANCELADA" &&
        o.estado !== "DADA_DE_BAJA"
    ).length;
    return {
      total: orders.length,
      activos,
      peritaje: orders.filter(
        (o) => o.estado === "PENDIENTE" || o.estado === "PENDIENTE_PERITAJE" || o.estado === "INGRESADO"
      ).length,
      reparacion: orders.filter(
        (o) => o.estado === "EN_CURSO" || o.estado === "EN_REPARACION" || o.estado === "PERITADO"
      ).length,
      repuestos: orders.filter(
        (o) => o.estado === "ESPERANDO_REPUESTOS" || o.estado === "EN_ESPERA_REPUESTOS" || o.estado === "DETENIDO"
      ).length,
      terminados: orders.filter(
        (o) => o.estado === "FINALIZADO" || o.estado === "TERMINADO" || o.estado === "REPARADO"
      ).length,
      entregados,
    };
  }, [orders]);

  // Filtrado de órdenes
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (estadoFilter === "TODOS") {
        if (
          o.estado === "ENTREGADO" ||
          o.estado === "ARCHIVADO" ||
          o.estado === "CANCELADO" ||
          o.estado === "CANCELADA" ||
          o.estado === "DADA_DE_BAJA"
        )
          return false;
      } else if (estadoFilter === "PENDIENTE") {
        if (o.estado !== "PENDIENTE" && o.estado !== "PENDIENTE_PERITAJE" && o.estado !== "INGRESADO")
          return false;
      } else if (estadoFilter === "EN_CURSO") {
        if (o.estado !== "EN_CURSO" && o.estado !== "EN_REPARACION" && o.estado !== "PERITADO")
          return false;
      } else if (estadoFilter === "ESPERANDO_REPUESTOS") {
        if (o.estado !== "ESPERANDO_REPUESTOS" && o.estado !== "EN_ESPERA_REPUESTOS" && o.estado !== "DETENIDO")
          return false;
      } else if (estadoFilter === "FINALIZADO") {
        if (o.estado !== "FINALIZADO" && o.estado !== "TERMINADO" && o.estado !== "REPARADO")
          return false;
      } else if (estadoFilter === "ENTREGADO") {
        if (
          o.estado !== "ENTREGADO" &&
          o.estado !== "ARCHIVADO" &&
          o.estado !== "CANCELADO" &&
          o.estado !== "CANCELADA" &&
          o.estado !== "DADA_DE_BAJA"
        )
          return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchPatente = o.vehicle?.patente?.toLowerCase().includes(q);
        const matchModelo = o.vehicle?.modelo?.toLowerCase().includes(q);
        const matchMarca = o.vehicle?.marca?.toLowerCase().includes(q);
        const matchCliente = `${o.vehicle?.client?.nombre || ""} ${o.vehicle?.client?.apellido || ""}`
          .toLowerCase()
          .includes(q);
        const matchNumero = String(o.numeroOrden).includes(q);

        if (!matchPatente && !matchModelo && !matchMarca && !matchCliente && !matchNumero) {
          return false;
        }
      }

      return true;
    });
  }, [orders, estadoFilter, search]);

  return (
    <div className="space-y-5 pb-16">
      {/* 1. Header Unificado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-sky-600 uppercase tracking-wider block">
                Módulo de Recepción
              </span>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Órdenes
              </h1>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {estadoFilter === "ENTREGADO"
              ? `${filteredOrders.length} ${filteredOrders.length === 1 ? "orden entregada / archivada" : "órdenes entregadas / archivadas"}`
              : `${filteredOrders.length} ${filteredOrders.length === 1 ? "vehículo en taller" : "vehículos en taller"} • Gestión de ingresos, peritaje y reparaciones activas.`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Refrescar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-sky-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ingresar Auto</span>
          </button>
        </div>
      </div>

      {/* Banner Éxito al Crear */}
      {createdOrderSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-600 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 truncate pr-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="truncate">
              Orden #{createdOrderSuccess.numeroOrden} ({createdOrderSuccess.vehicle?.patente}) ingresada con éxito.
            </span>
          </div>
          <Link
            href={`/app/ordenes/${createdOrderSuccess.id}`}
            className="px-3 py-1.5 rounded-lg bg-white text-emerald-900 font-extrabold text-xs shrink-0"
          >
            Abrir ➔
          </Link>
        </div>
      )}

      {/* Banner Éxito al Entregar / Archivar */}
      {deliveredSuccessMsg && (
        <div className="p-3.5 rounded-2xl bg-slate-900 text-white text-xs sm:text-sm font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 truncate pr-2">
            <PackageCheck className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="truncate">{deliveredSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeliveredSuccessMsg(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Filtros Limpios en Píldoras Horizontales */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => setEstadoFilter("TODOS")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
            estadoFilter === "TODOS"
              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
          }`}
        >
          Todos en Taller ({counts.activos})
        </button>

        <button
          type="button"
          onClick={() => setEstadoFilter("PENDIENTE")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
            estadoFilter === "PENDIENTE"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white text-slate-600 hover:bg-rose-50 border-slate-200"
          }`}
        >
          📋 Peritaje ({counts.peritaje})
        </button>

        <button
          type="button"
          onClick={() => setEstadoFilter("EN_CURSO")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
            estadoFilter === "EN_CURSO"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 hover:bg-blue-50 border-slate-200"
          }`}
        >
          🔧 En Taller ({counts.reparacion})
        </button>

        <button
          type="button"
          onClick={() => setEstadoFilter("ESPERANDO_REPUESTOS")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
            estadoFilter === "ESPERANDO_REPUESTOS"
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-white text-slate-600 hover:bg-amber-50 border-slate-200"
          }`}
        >
          ⏸️ En Pausa ({counts.repuestos})
        </button>

        <button
          type="button"
          onClick={() => setEstadoFilter("FINALIZADO")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
            estadoFilter === "FINALIZADO"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white text-slate-600 hover:bg-emerald-50 border-slate-200"
          }`}
        >
          🏁 Listos ({counts.terminados})
        </button>

        <button
          type="button"
          onClick={() => setEstadoFilter("ENTREGADO")}
          className={`shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer whitespace-nowrap ${
            estadoFilter === "ENTREGADO"
              ? "bg-slate-700 text-white border-slate-700 shadow-sm"
              : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
          }`}
        >
          📁 Archivadas ({counts.entregados})
        </button>
      </div>

      {/* 3. Barra de Búsqueda Rápida */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por patente, auto o cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 shadow-2xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Listado: Tarjetas Limpias para Mobile y Tabla Simple para Desktop */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mb-2"></div>
          <p>Cargando recepción...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
          No se encontraron vehículos para mostrar.
        </div>
      ) : (
        <div className="space-y-4">
          {/* VISTA MOBILE: Tarjetas Amplias, Espaciadas y Cómodas */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((orden) => {
              const statusInfo = getStatusInfo(orden.estado);

              return (
                <Link
                  key={orden.id}
                  href={`/app/ordenes/${orden.id}`}
                  className="group block bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md transition-all active:scale-[0.99]"
                >
                  {/* Fila 1: Patente, Nro de Orden y Badge de Estado */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ArgentinePlateBadge patente={orden.vehicle.patente} />
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        #{orden.numeroOrden}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-tight whitespace-nowrap shrink-0 ${statusInfo.badgeClass}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                      <span className="whitespace-nowrap">{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Fila 2: Modelo del Auto */}
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug mt-2.5 group-hover:text-sky-600 transition-colors">
                    {orden.vehicle.marca} {orden.vehicle.modelo}
                  </h3>

                  {/* Fila 3: Titular / Cliente */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 mt-1.5">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-800">
                      {orden.vehicle.client.nombre} {orden.vehicle.client.apellido}
                    </span>
                    {orden.vehicle.client.telefono && (
                      <span className="text-slate-400 text-xs">
                        • {orden.vehicle.client.telefono}
                      </span>
                    )}
                  </div>

                  {/* Motivo de Consulta */}
                  {orden.detallesIngreso && (
                    <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                      <span className="font-bold text-slate-500 block text-[11px] uppercase tracking-wider mb-1">
                        Motivo de Ingreso
                      </span>
                      <p className="line-clamp-2">{orden.detallesIngreso}</p>
                    </div>
                  )}

                  {/* Peritaje visual cliente */}
                  {orden.comentariosDuenio && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[11px] text-amber-800 uppercase tracking-wider">
                          Peritaje visual cliente
                        </span>
                        <p className="mt-0.5 leading-relaxed line-clamp-2">{orden.comentariosDuenio}</p>
                      </div>
                    </div>
                  )}

                  {/* Mecánico Asignado y Fecha */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Wrench className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-700 font-semibold">
                        {orden.mechanic ? `${orden.mechanic.nombre} ${orden.mechanic.apellido || ""}` : "Sin mecánico asignado"}
                      </span>
                    </div>

                    <span className="text-slate-400 font-medium">
                      {new Date(orden.fechaIngreso).toLocaleDateString("es-AR")}
                    </span>
                  </div>

                  {/* Botón de Ver Peritaje Registrado en Mobile */}
                  {isPeritajeRealizadoParaOrden(orden) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPeritajeModalOrder(orden);
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Ver Peritaje Realizado</span>
                    </button>
                  )}

                  {/* Botón de Imprimir Resguardo de Depósito en Mobile */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePrintResguardoFromOrder(orden);
                    }}
                    className="mt-2.5 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>🖨️ Imprimir Resguardo de Depósito</span>
                  </button>

                  {/* Botón Destacado: Avisar al Cliente si está Terminado y Botón Entregar */}
                  {(orden.estado === "FINALIZADO" || orden.estado === "TERMINADO" || orden.estado === "REPARADO") && (
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleNotifyClient(orden);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-sm transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{notifiedOrders[orden.id] ? "Aviso Enviado al Cliente ✓" : "Dar Aviso al Cliente (WhatsApp)"}</span>
                      </button>

                      <button
                        type="button"
                        disabled={deliveringOrderId === orden.id}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMarkAsDelivered(orden);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-extrabold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        <PackageCheck className="w-4 h-4 text-emerald-400" />
                        <span>{deliveringOrderId === orden.id ? "Archivando..." : "Marcar como Entregado / Archivar"}</span>
                      </button>
                    </div>
                  )}



                  {/* Indicador si la orden ya fue Entregada y Archivada */}
                  {(orden.estado === "ENTREGADO" || orden.estado === "ARCHIVADO") && !isCancelledOrder(orden) && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4 text-slate-500" />
                        <span>Vehículo Entregado (Archivado)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono font-medium">
                        {orden.fechaEntrega ? new Date(orden.fechaEntrega).toLocaleDateString("es-AR") : "Archivado"}
                      </span>
                    </div>
                  )}



                  {/* Fila inferior: CTA Claro y Grande */}
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-600 flex items-center gap-1 group-hover:text-sky-700">
                      <span>Ver orden de trabajo completa</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Ficha #{orden.numeroOrden}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* VISTA DESKTOP: Tabla de Columnas Esenciales */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[750px]">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Vehículo y Patente</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 whitespace-nowrap">Mecánico Asignado</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  <th className="py-3 px-4 whitespace-nowrap">Fecha</th>
                  <th className="py-3 px-4 text-right w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((orden) => {
                  const statusInfo = getStatusInfo(orden.estado);
                  const isFinished = orden.estado === "FINALIZADO" || orden.estado === "TERMINADO" || orden.estado === "REPARADO";

                  return (
                    <tr key={orden.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Vehículo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <ArgentinePlateBadge patente={orden.vehicle.patente} />
                          <div>
                            <Link
                              href={`/app/ordenes/${orden.id}`}
                              className="font-extrabold text-slate-900 hover:text-sky-600 block text-xs"
                            >
                              {orden.vehicle.marca} {orden.vehicle.modelo}
                            </Link>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-mono">
                                Orden #{orden.numeroOrden}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Cliente */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800 block text-xs">
                          {orden.vehicle.client.nombre} {orden.vehicle.client.apellido}
                        </span>
                      </td>

                      {/* 3. Mecánico Asignado */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {orden.mechanic ? (
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700 text-xs">
                              {orden.mechanic.nombre} {orden.mechanic.apellido || ""}
                            </span>
                          </div>
                        ) : isFinished ? (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Mecánica concluida
                          </span>
                        ) : isCancelledOrder(orden) ? (
                          <span className="text-[11px] font-semibold text-slate-400">
                            Cancelada
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-600">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      {/* 4. Estado */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-tight whitespace-nowrap shrink-0 ${statusInfo.badgeClass}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
                          <span className="whitespace-nowrap">{statusInfo.label}</span>
                        </span>
                      </td>

                      {/* 5. Fecha */}
                      <td className="py-3 px-4 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(orden.fechaIngreso).toLocaleDateString("es-AR")}
                      </td>

                      {/* 6. Acciones */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isFinished && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleNotifyClient(orden)}
                                className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center hover:scale-105"
                                title={notifiedOrders[orden.id] ? "Aviso enviado por WhatsApp ✓" : "Avisar al cliente por WhatsApp"}
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={deliveringOrderId === orden.id}
                                onClick={() => handleMarkAsDelivered(orden)}
                                className="p-2 rounded-xl text-white transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center hover:scale-105 disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                                title="Marcar vehículo como entregado al cliente y archivar orden"
                              >
                                <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePrintResguardoFromOrder(orden)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center hover:scale-105"
                            title="🖨️ Imprimir Resguardo de Depósito (A4)"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-700" />
                          </button>
                          <Link
                            href={`/app/ordenes/${orden.id}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center hover:scale-105"
                            title="Ver Ficha de la Orden"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal de Ingreso Progresivo de 4 Pasos */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
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
                onClick={() => setModalOpen(false)}
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
                          if (s.num < step) setStep(s.num as 1 | 2 | 3 | 4 | 5);
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
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
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

                  {/* Selector Destacado de Modo: Solo Icono y Label */}
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

                  {/* Contenido según el modo de cliente */}
                  {clientMode === "EXISTING" ? (
                    <div className="space-y-3 pt-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Buscar y seleccionar cliente del listado:
                      </label>

                      {/* Buscador / Combobox Interactivo */}
                      <div className="relative" ref={clientDropdownRef}>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={clientSearchQuery}
                            onChange={(e) => {
                              setClientSearchQuery(e.target.value);
                              openClientDropdown();
                            }}
                            onFocus={openClientDropdown}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setClientDropdownOpen(false);
                            }}
                            placeholder={
                              selectedClient
                                ? `${selectedClient.nombre} ${selectedClient.apellido} (Escribe para buscar o cambiar...)`
                                : `Buscar por nombre, apellido, DNI o teléfono (${existingClients.length} cargados)...`
                            }
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 shadow-2xs"
                          />
                          {clientSearchQuery ? (
                            <button
                              type="button"
                              onClick={() => {
                                setClientSearchQuery("");
                                openClientDropdown();
                              }}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={toggleClientDropdown}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown flotante con clientes filtrados - Renderizado via Portal para pasar por arriba del modal y pie */}
                        {mounted && clientDropdownOpen && clientDropdownPos.width > 0 && clientDropdownPos.left > 0 && createPortal(
                          <div
                            ref={clientPortalRef}
                            style={{
                              position: "fixed",
                              top: clientDropdownPos.top !== undefined ? `${clientDropdownPos.top}px` : undefined,
                              bottom: clientDropdownPos.bottom !== undefined ? `${clientDropdownPos.bottom}px` : undefined,
                              left: `${clientDropdownPos.left}px`,
                              width: `${clientDropdownPos.width}px`,
                              zIndex: 99999,
                            }}
                            className={`max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl py-1 divide-y divide-slate-100 ring-1 ring-black/10 select-none ${
                              clientDropdownPos.bottom !== undefined
                                ? "animate-dropdown-unfold-up"
                                : "animate-dropdown-unfold"
                            }`}
                          >
                            {filteredClients.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No se encontraron clientes con "{clientSearchQuery}"
                              </div>
                            ) : (
                              filteredClients.map((c: any) => {
                                const isSelected = c.id === selectedClientId;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectClient(c.id);
                                      setClientSearchQuery("");
                                      setClientDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-sky-50 transition-colors cursor-pointer ${
                                      isSelected ? "bg-sky-50/80 font-bold" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-[11px] shrink-0 border border-sky-200">
                                        {c.nombre?.[0] || ""}{c.apellido?.[0] || ""}
                                      </div>
                                      <div className="truncate">
                                        <div className="font-bold text-slate-900 truncate">
                                          {c.nombre} {c.apellido}
                                        </div>
                                        <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                          <span>DNI: {c.dni || "S/D"}</span>
                                          {c.telefono && <span>• Tel: {c.telefono}</span>}
                                        </div>
                                      </div>
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

                      {/* Tarjeta del cliente seleccionado - Distribución limpia y profesional */}
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

                  {/* Selector Destacado de Modo: Solo Icono y Label */}
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

                  {/* Contenido según el modo de vehículo */}
                  {vehicleMode === "EXISTING" ? (
                    <div className="space-y-3 pt-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Buscar y seleccionar vehículo registrado de {selectedClient ? `${selectedClient.nombre} ${selectedClient.apellido}` : "este titular"}:
                      </label>

                      {/* Buscador / Combobox Interactivo de Vehículos */}
                      <div className="relative" ref={vehicleDropdownRef}>
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={vehicleSearchQuery}
                            onChange={(e) => {
                              setVehicleSearchQuery(e.target.value);
                              openVehicleDropdown();
                            }}
                            onFocus={openVehicleDropdown}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setVehicleDropdownOpen(false);
                            }}
                            placeholder={
                              selectedVehicleId
                                ? `${(() => {
                                    const v = clientVehicles.find((item: any) => item.id === selectedVehicleId) || existingVehicles.find((item: any) => item.id === selectedVehicleId);
                                    return v ? `${v.patente} — ${v.marca} ${v.modelo}` : "Escribe para buscar auto...";
                                  })()}`
                                : `Buscar por patente, marca o modelo (${clientVehicles.length} disponibles)...`
                            }
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 font-medium text-xs bg-white text-slate-900 focus:ring-2 focus:ring-sky-500 focus:outline-none placeholder:text-slate-400 shadow-2xs"
                          />
                          {vehicleSearchQuery ? (
                            <button
                              type="button"
                              onClick={() => {
                                setVehicleSearchQuery("");
                                openVehicleDropdown();
                              }}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={toggleVehicleDropdown}
                              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Dropdown flotante con vehículos del cliente via Portal para pasar por arriba del modal */}
                        {mounted && vehicleDropdownOpen && vehicleDropdownPos.width > 0 && vehicleDropdownPos.left > 0 && createPortal(
                          <div
                            ref={vehiclePortalRef}
                            style={{
                              position: "fixed",
                              top: vehicleDropdownPos.top !== undefined ? `${vehicleDropdownPos.top}px` : undefined,
                              bottom: vehicleDropdownPos.bottom !== undefined ? `${vehicleDropdownPos.bottom}px` : undefined,
                              left: `${vehicleDropdownPos.left}px`,
                              width: `${vehicleDropdownPos.width}px`,
                              zIndex: 99999,
                            }}
                            className={`max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl py-1 divide-y divide-slate-100 ring-1 ring-black/10 select-none ${
                              vehicleDropdownPos.bottom !== undefined
                                ? "animate-dropdown-unfold-up"
                                : "animate-dropdown-unfold"
                            }`}
                          >
                            {filteredClientVehicles.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-400">
                                No se encontraron vehículos del cliente con "{vehicleSearchQuery}"
                              </div>
                            ) : (
                              filteredClientVehicles.map((v: any) => {
                                const isSelected = v.id === selectedVehicleId;
                                const activeOrder = getVehicleActiveOrder(v.id, v.patente);
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectVehicle(v.id);
                                      setVehicleSearchQuery("");
                                      setVehicleDropdownOpen(false);
                                    }}
                                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs hover:bg-sky-50 transition-colors cursor-pointer ${
                                      isSelected ? "bg-sky-50/80 font-bold" : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <ArgentinePlateBadge patente={v.patente} />
                                      <div className="truncate">
                                        <div className="font-bold text-slate-900 truncate">
                                          {v.marca} {v.modelo} {v.anio ? `(${v.anio})` : ""}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          {v.color ? `Color: ${v.color}` : "Vehículo del titular"}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {activeOrder && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                          En Taller (#{activeOrder.numeroOrden})
                                        </span>
                                      )}
                                      {isSelected && <Check className="w-4 h-4 text-sky-600 stroke-[3] shrink-0" />}
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Tarjeta del vehículo seleccionado - Distribución limpia y profesional */}
                      {selectedVehicleId && (() => {
                        const vehicle = clientVehicles.find((v: any) => v.id === selectedVehicleId) || existingVehicles.find((v: any) => v.id === selectedVehicleId);
                        if (!vehicle) return null;
                        return (
                          <div className="space-y-2.5">
                            {selectedVehicleActiveOrder && (
                              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5 animate-dropdown-unfold">
                                <div className="flex items-center gap-2 font-bold text-amber-800">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span>Vehículo actualmente activo en el taller</span>
                                </div>
                                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                                  Este vehículo ya cuenta con la <strong>Orden activa #{selectedVehicleActiveOrder.numeroOrden}</strong> en estado <strong>'{selectedVehicleActiveOrder.estado}'</strong>. El mismo auto no puede estar dos veces en peritaje o en reparación simultáneamente. Debe entregarse y archivarse la orden actual antes de habilitar un nuevo ingreso.
                                </p>
                                <div className="pt-0.5">
                                  <Link
                                    href={`/app/ordenes/${selectedVehicleActiveOrder.id}`}
                                    target="_blank"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-800 underline"
                                  >
                                    Ver Orden #{selectedVehicleActiveOrder.numeroOrden} activa →
                                  </Link>
                                </div>
                              </div>
                            )}

                            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/40 border border-slate-200 shadow-2xs space-y-3 animate-dropdown-unfold">
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
                                La patente {orderForm.vehiculoPatente} ya posee la <strong>Orden activa #{newPlateActiveOrder.numeroOrden}</strong> ({newPlateActiveOrder.estado}) en el taller. Debe entregarse y archivarse la orden actual antes de poder reingresar este vehículo.
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

                  {/* Motivo de Consulta */}
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

                  {/* Combustible y Kilometraje */}
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
                        placeholder="Ej: 45000"
                        value={orderForm.kilometraje}
                        onChange={(e) => setOrderForm({ ...orderForm, kilometraje: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-medium text-xs"
                      />
                    </div>
                  </div>

                  {/* Tuerca de Seguridad */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">¿Posee Tuerca de Seguridad en las ruedas?</span>
                        <span className="text-[11px] text-slate-500">Indica si tiene bulón antirrobo y dónde se encuentra el adaptador.</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => setOrderForm({ ...orderForm, tuercaSeguridad: false, tuercaSeguridadUbicacion: "" })}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            !orderForm.tuercaSeguridad ? "bg-slate-800 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderForm({ ...orderForm, tuercaSeguridad: true })}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                            orderForm.tuercaSeguridad ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Sí
                        </button>
                      </div>
                    </div>
                    {orderForm.tuercaSeguridad && (
                      <div className="pt-1 animate-in fade-in">
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          Ubicación de la tuerca / adaptador antirrobo:
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: En la guantera / baúl junto al auxilio / cenicero..."
                          value={orderForm.tuercaSeguridadUbicacion}
                          onChange={(e) => setOrderForm({ ...orderForm, tuercaSeguridadUbicacion: e.target.value })}
                          className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-medium text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Peritaje Visual Inicial del Dueño */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-amber-900">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold text-xs">Peritaje Inicial del Cliente (Daños Previos)</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                        Resguardo Legal
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900 leading-tight">
                      Abolladuras, raspones y detalles que el auto ya trae al entregarse en recepción:
                    </p>
                    <textarea
                      rows={2}
                      placeholder="Ej: El cliente manifiesta tener un bollo en guardabarro trasero derecho por estacionamiento, raspón en paragolpe delantero..."
                      value={orderForm.comentariosDuenio}
                      onChange={(e) => setOrderForm({ ...orderForm, comentariosDuenio: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-medium text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-amber-900 font-bold">Atajos rápidos:</span>
                      {[
                        "Paragolpe rayado",
                        "Bollo en puerta",
                        "Parabrisas picado",
                        "Óptica rajada",
                        "Sin daños previos (impecable)",
                      ].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            const current = orderForm.comentariosDuenio.trim();
                            const updated = current ? `${current}. ${sug}` : sug;
                            setOrderForm({ ...orderForm, comentariosDuenio: updated });
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold transition-colors cursor-pointer"
                        >
                          + {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Esquema Interactivo de Daños */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-slate-800 block">Esquema Gráfico de Daños Preexistentes</span>
                        <span className="text-[11px] text-slate-500">Toca las zonas del auto para marcar rayones, abolladuras o roturas previas.</span>
                      </div>
                      {orderForm.damagePins.length > 0 && (
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          {orderForm.damagePins.length} detalle{orderForm.damagePins.length > 1 ? "s" : ""} marcado{orderForm.damagePins.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 p-2 sm:p-3">
                      <CarDamageBlueprint
                        pins={orderForm.damagePins}
                        onChange={(pins) => setOrderForm({ ...orderForm, damagePins: pins })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PASO 4: FIRMA DEL CLIENTE EN TABLET */}
              {step === 4 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <PenTool className="w-4 h-4 text-sky-600" />
                      <span>4. Firma del Cliente en Tablet (Resguardo de Depósito)</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      El cliente rubrica la entrega del vehículo y la autorización directamente en pantalla.
                    </p>
                  </div>

                  {/* Cláusula Legal de Autorización en Rojo */}
                  <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-2 font-black text-xs text-rose-900 uppercase tracking-wide">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>AUTORIZACIÓN DE GUARDA Y CIRCULACIÓN</span>
                    </div>
                    <p className="text-[11px] font-bold leading-relaxed text-rose-900">
                      AUTORIZO AL TALLER A UBICAR Y MANTENER EL VEHÍCULO EN LA VÍA PÚBLICA, ASÍ COMO A CIRCULAR PARA PRUEBAS MECÁNICAS. EL TALLER NO RESPONDE POR OBJETOS DE VALOR DEJADOS EN EL INTERIOR.
                    </p>
                    <p className="text-[10px] text-rose-700 font-medium">
                      El cliente reconoce la exactitud de los daños y el kilometraje asentados en este resguardo al momento de la entrega.
                    </p>
                  </div>

                  {/* Pad de Firma Digital para Tablet */}
                  <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Firma Digital del Cliente:</span>
                      <span className={`text-[11px] font-bold ${orderForm.firmaCliente ? "text-emerald-600" : "text-slate-400"}`}>
                        {orderForm.firmaCliente ? "✓ Firma registrada correctamente" : "Firma requerida en pantalla"}
                      </span>
                    </div>
                    <ClientSignaturePad
                      value={orderForm.firmaCliente}
                      onChange={(sig) => setOrderForm({ ...orderForm, firmaCliente: sig })}
                      height={190}
                      title="Firma del Titular / Conductor al ingresar"
                    />
                  </div>
                </div>
              )}

              {/* PASO 5: ASIGNACIÓN Y CONFIRMACIÓN FINAL */}
              {step === 5 && (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">5. Asignación de Mecánico y Confirmación</h4>
                    <p className="text-xs text-slate-500">Revisa el resumen final y confirma el ingreso al taller.</p>
                  </div>

                  {/* Asignación de Mecánico */}
                  {isMechanic ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-emerald-600" />
                          <span>Mecánico Responsable Asignado</span>
                        </span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                          Autoasignado
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-300 font-semibold text-xs text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                          {currentUser?.nombre?.[0] || "M"}
                        </div>
                        <span>
                          {currentUser?.nombre} {currentUser?.apellido || ""} (Vos)
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Como estás recibiendo el vehículo, la orden se asignará automáticamente a tu Hoja de Ruta.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <Wrench className="w-4 h-4 text-sky-600" />
                          <span>Asignar Mecánico Responsable</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Opcional</span>
                      </div>
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

                  {/* Resumen Final de Confirmación */}
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
                              ? existingClients.find((c) => c.id === selectedClientId)?.nombre + " " + (existingClients.find((c) => c.id === selectedClientId)?.apellido || "")
                              : orderForm.clienteNombre + " " + orderForm.clienteApellido}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                            <span>CUIL/DNI: <strong className="font-mono text-slate-700">{clientMode === "EXISTING" ? existingClients.find((c) => c.id === selectedClientId)?.dni : orderForm.clienteDni || "S/D"}</strong></span>
                            <span>Tel: <strong className="text-slate-700">{clientMode === "EXISTING" ? existingClients.find((c) => c.id === selectedClientId)?.telefono : orderForm.clienteTelefono || "S/D"}</strong></span>
                            {(clientMode === "EXISTING" ? existingClients.find((c) => c.id === selectedClientId)?.email : orderForm.clienteEmail) && (
                              <span>Email: <strong className="text-slate-700">{clientMode === "EXISTING" ? existingClients.find((c) => c.id === selectedClientId)?.email : orderForm.clienteEmail}</strong></span>
                            )}
                            {(clientMode === "EXISTING" ? existingClients.find((c) => c.id === selectedClientId)?.direccion : orderForm.clienteDireccion) && (
                              <span>Dirección: <strong className="text-slate-700">{clientMode === "EXISTING" ? existingClients.find((c) => c.id === selectedClientId)?.direccion : orderForm.clienteDireccion}</strong></span>
                            )}
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

                      {/* Tuerca de Seguridad */}
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Tuerca de Seguridad</span>
                        <span className="text-xs font-semibold text-slate-800">
                          {orderForm.tuercaSeguridad
                            ? `Sí (${orderForm.tuercaSeguridadUbicacion || "Ubicación a definir"})`
                            : "No tiene"}
                        </span>
                      </div>

                      {/* Daños Previos */}
                      {(orderForm.comentariosDuenio || orderForm.damagePins.length > 0) && (
                        <div className="pt-2">
                          <span className="text-[10px] uppercase font-bold text-amber-700 block">Daños previos constatados</span>
                          {orderForm.comentariosDuenio && (
                            <p className="text-amber-900 font-medium mt-0.5">{orderForm.comentariosDuenio}</p>
                          )}
                          {orderForm.damagePins.length > 0 && (
                            <span className="inline-block mt-1 text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                              {orderForm.damagePins.length} marcas registradas en el plano gráfico
                            </span>
                          )}
                        </div>
                      )}

                      {/* Firma del Cliente */}
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Firma en Tablet</span>
                        {orderForm.firmaCliente ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Rubricada digitalmente por el cliente
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            Sin firma registrada (se puede firmar en papel)
                          </span>
                        )}
                      </div>

                      {/* Mecánico Asignado */}
                      <div className="pt-2 flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Mecánico Asignado</span>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {isMechanic
                              ? `${currentUser?.nombre} ${currentUser?.apellido || ""} (Autoasignado)`
                              : orderForm.mechanicId
                              ? mechanics.find((m) => m.id === orderForm.mechanicId)?.nombre + " " + (mechanics.find((m) => m.id === orderForm.mechanicId)?.apellido || "")
                              : "Sin asignar (a definir)"}
                          </span>
                        </div>
                      </div>

                      {/* Conflicto de vehículo activo en taller */}
                      {(selectedVehicleActiveOrder || newPlateActiveOrder) && (
                        <div className="pt-2">
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="font-semibold">
                              Operación bloqueada: Este vehículo ya cuenta con la Orden activa #{
                                (selectedVehicleActiveOrder || newPlateActiveOrder)?.numeroOrden
                              } ({(selectedVehicleActiveOrder || newPlateActiveOrder)?.estado}). No puede crearse una nueva orden hasta entregar y archivar la previa.
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
                  onClick={() => setModalOpen(false)}
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
      )}

      {/* Modal propio del sistema para confirmación de entrega y archivado */}
      <ConfirmDeliveryModal
        isOpen={Boolean(orderToDeliver)}
        onClose={() => setOrderToDeliver(null)}
        onConfirm={handleConfirmDeliver}
        loading={Boolean(deliveringOrderId)}
        orderInfo={
          orderToDeliver
            ? {
                numeroOrden: orderToDeliver.numeroOrden,
                marca: orderToDeliver.vehicle?.marca,
                modelo: orderToDeliver.vehicle?.modelo,
                patente: orderToDeliver.vehicle?.patente,
                clienteNombre: `${orderToDeliver.vehicle?.client?.nombre || ""} ${orderToDeliver.vehicle?.client?.apellido || ""}`.trim(),
                clienteTelefono: orderToDeliver.vehicle?.client?.telefono,
              }
            : null
        }
      />


      {/* Modal de Consulta Local de Peritaje Realizado (Solo Lectura) */}
      {peritajeModalOrder && (
        <PeritajeIngresoModal
          order={peritajeModalOrder}
          isOpen={Boolean(peritajeModalOrder)}
          onClose={() => setPeritajeModalOrder(null)}
          onSaved={() => fetchOrders()}
          readOnly={true}
        />
      )}

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
                  <span>🖨️ Imprimir Resguardo de Depósito (A4)</span>
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
                  onClick={() => setCreatedOrderSuccessModal(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  Cerrar ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
