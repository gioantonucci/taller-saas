import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const INITIAL_INVENTORY_SEED = [
  {
    nombre: "Juego de Pastillas Delanteras Bosch",
    codigo: "BOS-PD1422",
    categoria: "Frenos",
    stock: 8,
    stockMinimo: 2,
    costo: 32000,
    precioVenta: 48000,
  },
  {
    nombre: "Filtro de Aceite Mann W712",
    codigo: "MANN-W712",
    categoria: "Filtros",
    stock: 15,
    stockMinimo: 4,
    costo: 11500,
    precioVenta: 18000,
  },
  {
    nombre: "Aceite Motor Sintético 5W-40 (4L)",
    codigo: "MOT-5W40-4L",
    categoria: "Fluidos",
    stock: 6,
    stockMinimo: 2,
    costo: 42000,
    precioVenta: 63000,
  },
  {
    nombre: "Juego de Bujías NGK Iridium",
    codigo: "NGK-BKR6E",
    categoria: "Encendido",
    stock: 12,
    stockMinimo: 4,
    costo: 9500,
    precioVenta: 15000,
  },
  {
    nombre: "Amortiguador Delantero Monroe",
    codigo: "MON-G7328",
    categoria: "Suspensión",
    stock: 2,
    stockMinimo: 2,
    costo: 85000,
    precioVenta: 125000,
  },
  {
    nombre: "Kit Correa de Distribución Gates",
    codigo: "GAT-K015569",
    categoria: "Motor",
    stock: 3,
    stockMinimo: 1,
    costo: 68000,
    precioVenta: 99000,
  },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const filter = searchParams.get("filter"); // "LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"

    // Auto-seed inicial si el inventario está vacío
    const countTotal = await prisma.inventoryItem.count();
    if (countTotal === 0) {
      for (const it of INITIAL_INVENTORY_SEED) {
        await prisma.inventoryItem.create({ data: it });
      }
    }

    const where: any = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search } },
        { codigo: { contains: search.toUpperCase() } },
        { categoria: { contains: search } },
      ];
    }

    if (filter === "LOW_STOCK") {
      where.stock = { gt: 0, lte: 2 };
    } else if (filter === "OUT_OF_STOCK") {
      where.stock = { lte: 0 };
    } else if (filter === "IN_STOCK") {
      where.stock = { gt: 0 };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [{ stock: "asc" }, { updatedAt: "desc" }],
    });

    // Calcular estadísticas de stock
    const allItems = await prisma.inventoryItem.findMany();
    const totalCatalogItems = allItems.length;
    const totalUnitsInStock = allItems.reduce((acc, it) => acc + Math.max(0, it.stock), 0);
    const lowStockCount = allItems.filter((it) => it.stock > 0 && it.stock <= it.stockMinimo).length;
    const outOfStockCount = allItems.filter((it) => it.stock <= 0).length;
    const totalInventoryValue = allItems.reduce((acc, it) => acc + (Math.max(0, it.stock) * it.costo), 0);

    return NextResponse.json({
      success: true,
      items,
      stats: {
        totalCatalogItems,
        totalUnitsInStock,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue,
      },
    });
  } catch (error: any) {
    console.error("Error en GET /api/inventory:", error);
    return NextResponse.json(
      { error: "Error al obtener el inventario de repuestos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Soporte para carga masiva (ej. lote extraído por OCR) o carga individual
    const rawItems = Array.isArray(body.items) ? body.items : [body];
    const archivoFacturaURL = body.archivoFacturaURL || undefined;

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "Debe proveer al menos un repuesto para el inventario" },
        { status: 400 }
      );
    }

    const savedItems = [];

    for (const it of rawItems) {
      const nombre = it.nombreRepuesto || it.nombre || "Repuesto";
      const codigo = it.codigo?.trim().toUpperCase() || undefined;
      const cantidad = parseInt(it.cantidad, 10) || 1;
      const costo = parseFloat(it.costo) || 0;
      const precioVenta = parseFloat(it.precioVenta) || Math.round(costo * 1.45);
      const categoria = it.categoria || "Mecánica General";
      const stockMinimo = parseInt(it.stockMinimo, 10) || 2;

      // Si ya existe un repuesto con el mismo código exacto en el inventario, sumamos stock
      let existingItem = null;
      if (codigo) {
        existingItem = await prisma.inventoryItem.findFirst({
          where: { codigo },
        });
      }

      if (!existingItem) {
        existingItem = await prisma.inventoryItem.findFirst({
          where: { nombre },
        });
      }

      if (existingItem) {
        const updated = await prisma.inventoryItem.update({
          where: { id: existingItem.id },
          data: {
            stock: { increment: cantidad },
            costo: costo > 0 ? costo : existingItem.costo,
            precioVenta: precioVenta > 0 ? precioVenta : existingItem.precioVenta,
            archivoFacturaURL: archivoFacturaURL || existingItem.archivoFacturaURL,
          },
        });
        savedItems.push(updated);
      } else {
        const created = await prisma.inventoryItem.create({
          data: {
            nombre,
            codigo,
            categoria,
            stock: cantidad,
            stockMinimo,
            costo,
            precioVenta,
            archivoFacturaURL,
          },
        });
        savedItems.push(created);
      }
    }

    await recordAuditLog({
      user: session,
      accion: "CREATE",
      entidad: "Inventory",
      entidadAfectada: "Inventory",
      detallesCambio: {
        itemsCount: savedItems.length,
        items: savedItems.map((it) => ({ id: it.id, nombre: it.nombre, codigo: it.codigo, stock: it.stock })),
        descripcion: `Ingreso de ${savedItems.length} repuesto(s) al inventario de stock`,
      },
    });

    return NextResponse.json({
      success: true,
      count: savedItems.length,
      savedItems,
    });
  } catch (error: any) {
    console.error("Error en POST /api/inventory:", error);
    return NextResponse.json(
      { error: "Error al registrar repuestos en el inventario" },
      { status: 500 }
    );
  }
}
