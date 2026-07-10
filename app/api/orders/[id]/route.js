import { NextResponse } from "next/server";
import { getOrders, saveOrders } from "@/lib/orders-store";
import { STATUSES } from "@/lib/constants";

// PATCH /api/orders/:id -> por ahora solo se usa para cambiar el estatus
export async function PATCH(request, { params }) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  try {
    const orders = await getOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    if (body?.estatus !== undefined) {
      if (!STATUSES.includes(body.estatus)) {
        return NextResponse.json(
          { error: `El estatus debe ser uno de: ${STATUSES.join(", ")}.` },
          { status: 400 }
        );
      }
      orders[idx] = { ...orders[idx], estatus: body.estatus };
    }

    await saveOrders(orders);
    return NextResponse.json({ order: orders[idx] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/orders/:id -> elimina un pedido
export async function DELETE(_request, { params }) {
  const { id } = await params;

  try {
    const orders = await getOrders();
    const filtered = orders.filter((o) => o.id !== id);
    if (filtered.length === orders.length) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    await saveOrders(filtered);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
