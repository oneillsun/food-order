import { NextResponse } from "next/server";
import { getOrders, saveOrders } from "@/lib/orders-store";
import { STATUSES } from "@/lib/constants";
import { validateOrderInput } from "@/lib/validate-order";

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

  const { error, value } = validateOrderInput(body);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const orders = await getOrders();
    const newOrder = {
      id: crypto.randomUUID(),
      ...value,
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
