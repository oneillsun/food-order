import { NextResponse } from "next/server";
import { getOrders, saveOrders } from "@/lib/orders-store";
import { STATUSES, MAX_COPIES_PER_SUBMIT } from "@/lib/constants";
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

// POST /api/orders -> crea uno o más pedidos idénticos (copias exactas)
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

  const copies = body?.copies === undefined ? 1 : Number(body.copies);
  if (!Number.isInteger(copies) || copies < 1 || copies > MAX_COPIES_PER_SUBMIT) {
    return NextResponse.json(
      { error: `La cantidad de pedidos iguales debe ser entre 1 y ${MAX_COPIES_PER_SUBMIT}.` },
      { status: 400 }
    );
  }

  try {
    const orders = await getOrders();
    const baseTime = new Date();
    const newOrders = Array.from({ length: copies }, (_, i) => ({
      id: crypto.randomUUID(),
      ...value,
      estatus: STATUSES[0],
      createdAt: new Date(baseTime.getTime() + i).toISOString(),
    }));

    orders.push(...newOrders);
    await saveOrders(orders);

    return NextResponse.json({ orders: newOrders }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
