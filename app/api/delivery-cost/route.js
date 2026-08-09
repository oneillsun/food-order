import { NextResponse } from "next/server";
import { calculateDeliveryCost } from "@/lib/delivery";

// GET /api/delivery-cost?direccion=... -> { free, distanceMiles, cost }
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const direccion = searchParams.get("direccion");

  if (!direccion) {
    return NextResponse.json({ error: "Falta la dirección." }, { status: 400 });
  }

  try {
    const result = await calculateDeliveryCost(direccion);
    if (!result) {
      return NextResponse.json(
        { error: "No se pudo ubicar esta dirección para calcular el delivery." },
        { status: 422 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
