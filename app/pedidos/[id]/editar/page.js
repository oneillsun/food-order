"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OrderForm from "@/components/OrderForm";

export default function EditarPedidoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el pedido.");
        setOrder(data.order);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <p className="text-center text-slate-500">Cargando pedido…</p>;
  }

  if (error) {
    return (
      <p className="mx-auto max-w-lg rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (order.estatus !== "Pendiente") {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-amber-800">
          Este pedido ya está en estatus <strong>{order.estatus}</strong> y ya no se puede
          editar.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-700"
        >
          Volver al dashboard
        </button>
      </div>
    );
  }

  return <OrderForm order={order} />;
}
