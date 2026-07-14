import { NextResponse } from "next/server";
import { list, get, del } from "@vercel/blob";
import { putOrder } from "@/lib/orders-store";

// Endpoint de un solo uso: copia los pedidos guardados en el antiguo
// orders.json compartido (formato previo a orders/<id>.json) al nuevo
// almacenamiento por-pedido, y borra el archivo viejo al terminar.
//
// Uso (una sola vez, después de desplegar el nuevo formato de almacenamiento):
//   POST /api/migrate-legacy-orders            -> vista previa (no escribe nada)
//   POST /api/migrate-legacy-orders?confirm=1  -> migra de verdad
//
// Seguro de llamar más de una vez: si ya no queda orders.json legado, no
// hace nada. Bórralo del código una vez confirmes que la migración funcionó.
const LEGACY_PATHNAME = "orders.json";

export async function POST(request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Esta migración requiere Vercel Blob configurado (BLOB_READ_WRITE_TOKEN)." },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const confirm = searchParams.get("confirm") === "1";

  try {
    const { blobs } = await list({ prefix: LEGACY_PATHNAME, limit: 10 });
    const match = blobs.find((b) => b.pathname === LEGACY_PATHNAME);
    if (!match) {
      return NextResponse.json({ migrated: 0, message: "No se encontró un orders.json legado." });
    }

    const result = await get(LEGACY_PATHNAME, { access: "public", useCache: false });
    if (!result || !result.stream) {
      return NextResponse.json({
        migrated: 0,
        message: "El orders.json legado existe pero está vacío o no se pudo leer.",
      });
    }
    const text = await new Response(result.stream).text();
    const legacyOrders = JSON.parse(text);

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        found: legacyOrders.length,
        message: "Vuelve a llamar con ?confirm=1 para migrarlos de verdad.",
      });
    }

    await Promise.all(legacyOrders.map((order) => putOrder(order)));
    await del(LEGACY_PATHNAME);

    return NextResponse.json({ migrated: legacyOrders.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
