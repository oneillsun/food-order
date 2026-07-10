import { NextResponse } from "next/server";
import { getOrders, saveOrders } from "@/lib/orders-store";
import { COMBO_SIZE, MAX_UNITS_PER_ORDER, FOOD_TYPES, FLAVORS, STATUSES } from "@/lib/constants";

// GET /api/orders            -> todos los pedidos
// GET /api/orders?fecha=YYYY-MM-DD -> pedidos de una fecha puntual
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");

  let orders;
  try {
    orders = await getOrders();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const filtered = fecha ? orders.filter((o) => o.fecha === fecha) : orders;
  filtered.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  return NextResponse.json({ orders: filtered });
}

// POST /api/orders -> crea un pedido nuevo
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  const { fecha, cliente, comida, sabores } = body ?? {};

  if (!fecha || typeof fecha !== "string") {
    return NextResponse.json({ error: "La fecha es obligatoria." }, { status: 400 });
  }
  if (!cliente || typeof cliente !== "string" || !cliente.trim()) {
    return NextResponse.json({ error: "El nombre del cliente es obligatorio." }, { status: 400 });
  }
  if (!FOOD_TYPES.includes(comida)) {
    return NextResponse.json(
      { error: `La comida debe ser una de: ${FOOD_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }

  // El combo por defecto es un mínimo; se permite agregar unidades extra
  // como excepción (ej. 4 empanadas en vez de 3), hasta un tope de seguridad.
  const minCount = COMBO_SIZE[comida];
  if (
    !Array.isArray(sabores) ||
    sabores.length < minCount ||
    sabores.length > MAX_UNITS_PER_ORDER
  ) {
    return NextResponse.json(
      {
        error: `La cantidad de sabores para ${comida} debe ser entre ${minCount} (combo por defecto) y ${MAX_UNITS_PER_ORDER}.`,
      },
      { status: 400 }
    );
  }
  if (sabores.some((s) => !FLAVORS.includes(s))) {
    return NextResponse.json(
      { error: `Cada sabor debe ser uno de: ${FLAVORS.join(", ")}.` },
      { status: 400 }
    );
  }

  try {
    const orders = await getOrders();
    const newOrder = {
      id: crypto.randomUUID(),
      fecha,
      cliente: cliente.trim(),
      comida,
      sabores,
      estatus: STATUSES[0],
      createdAt: new Date().toISOString(),
    };

    orders.push(newOrder);
    await saveOrders(orders);

    return NextResponse.json({ order: newOrder }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
