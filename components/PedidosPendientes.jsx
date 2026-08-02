"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PRICE_PER_ORDER } from "@/lib/constants";

export default function PedidosPendientes() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/orders", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error cargando los pedidos.");
        setOrders(data.orders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const rows = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      if (o.estatus !== "Pendiente") continue;
      const key = `${o.fecha}|${o.cliente}`;
      const entry = map.get(key) || { fecha: o.fecha, cliente: o.cliente, cantidad: 0, ids: [] };
      entry.cantidad += 1;
      entry.ids.push(o.id);
      map.set(key, entry);
    }
    return [...map.values()]
      .map((r) => ({ ...r, monto: r.cantidad * PRICE_PER_ORDER }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.cliente.localeCompare(b.cliente));
  }, [orders]);

  async function markPaid(key, ids) {
    setBusyKey(key);
    setError("");
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/orders/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ estatus: "Pagado" }),
          })
        )
      );
      if (results.some((res) => !res.ok)) {
        throw new Error("No se pudo actualizar el estatus de algunos pedidos.");
      }
      setOrders((prev) =>
        prev.map((o) => (ids.includes(o.id) ? { ...o, estatus: "Pagado" } : o))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
    }
  }

  const totales = useMemo(
    () => ({
      cantidad: rows.reduce((sum, r) => sum + r.cantidad, 0),
      monto: rows.reduce((sum, r) => sum + r.monto, 0),
    }),
    [rows]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pedidos pendientes</h1>
          <p className="text-sm text-slate-500">
            Todos los pedidos en estatus Pendiente, de la fecha más antigua a la más reciente.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Volver al dashboard
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando pedidos…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          No hay pedidos pendientes.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Cantidad Pedidos</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.fecha}|${r.cliente}`;
                return (
                  <tr key={key} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">{r.fecha}</td>
                    <td className="px-4 py-3">{r.cliente}</td>
                    <td className="px-4 py-3 text-right">{r.cantidad}</td>
                    <td className="px-4 py-3 text-right">${r.monto}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => markPaid(key, r.ids)}
                        disabled={busyKey === key}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Marcar como Pagado
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50 font-semibold">
                <td className="px-4 py-3" colSpan={2}>
                  Total
                </td>
                <td className="px-4 py-3 text-right">{totales.cantidad}</td>
                <td className="px-4 py-3 text-right">${totales.monto}</td>
                <td className="px-4 py-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
