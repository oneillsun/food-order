import { NextResponse } from "next/server";
import { getOrder, putOrder, deleteOrder } from "@/lib/orders-store";
import { STATUSES } from "@/lib/constants";
import { validateOrderInput } from "@/lib/validate-order";

// GET /api/orders/:id -> un pedido puntual
export async function GET(_request, { params }) {
  const { id } = await params;

  try {
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

const CONTENT_FIELDS = ["fecha", "cliente", "comida", "sabores"];

// PATCH /api/orders/:id
// - { estatus } -> cambia el estatus, en cualquier momento.
// - { fecha, cliente, comida, sabores } -> edita el contenido del pedido,
//   solo permitido mientras el pedido está en estatus "Pendiente".
export async function PATCH(request, { params }) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la petición inválido." }, { status: 400 });
  }

  try {
    const current = await getOrder(id);
    if (!current) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    let updated = current;

    const wantsContentEdit = CONTENT_FIELDS.some((k) => body?.[k] !== undefined);
    if (wantsContentEdit) {
      if (updated.estatus !== "Pendiente") {
        return NextResponse.json(
          { error: "Solo se puede editar un pedido mientras está en estatus Pendiente." },
          { status: 400 }
        );
      }
      const { error, value } = validateOrderInput(body);
      if (error) {
        return NextResponse.json({ error }, { status: 400 });
      }
      updated = { ...updated, ...value };
    }

    if (body?.estatus !== undefined) {
      if (!STATUSES.includes(body.estatus)) {
        return NextResponse.json(
          { error: `El estatus debe ser uno de: ${STATUSES.join(", ")}.` },
          { status: 400 }
        );
      }
      updated = { ...updated, estatus: body.estatus };
    }

    await putOrder(updated);
    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/orders/:id -> elimina un pedido
export async function DELETE(_request, { params }) {
  const { id } = await params;

  try {
    const current = await getOrder(id);
    if (!current) {
      return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
    }

    await deleteOrder(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
