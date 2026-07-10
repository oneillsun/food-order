"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FLAVORS, STATUSES, PRICE_PER_ORDER } from "@/lib/constants";

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  Pendiente: "border-amber-300 bg-amber-100 text-amber-800",
  Pagado: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [fecha, setFecha] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function loadAll() {
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

  useEffect(() => {
    loadAll();
  }, []);

  const dateCounts = useMemo(() => {
    const map = new Map();
    for (const o of orders) map.set(o.fecha, (map.get(o.fecha) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [orders]);

  const dayOrders = useMemo(
    () =>
      orders
        .filter((o) => o.fecha === fecha)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [orders, fecha]
  );

  const summary = useMemo(() => {
    const s = {
      total: dayOrders.length,
      Empanada: 0,
      Arepa: 0,
      saboresPorComida: {
        Empanada: Object.fromEntries(FLAVORS.map((f) => [f, 0])),
        Arepa: Object.fromEntries(FLAVORS.map((f) => [f, 0])),
      },
      estatus: Object.fromEntries(STATUSES.map((st) => [st, 0])),
    };
    for (const o of dayOrders) {
      s[o.comida] = (s[o.comida] || 0) + 1;
      s.estatus[o.estatus] = (s.estatus[o.estatus] || 0) + 1;
      for (const sabor of o.sabores) {
        s.saboresPorComida[o.comida][sabor] = (s.saboresPorComida[o.comida][sabor] || 0) + 1;
      }
    }
    s.unidadesPorComida = {
      Empanada: Object.values(s.saboresPorComida.Empanada).reduce((a, b) => a + b, 0),
      Arepa: Object.values(s.saboresPorComida.Arepa).reduce((a, b) => a + b, 0),
    };
    s.totalEstimado = s.total * PRICE_PER_ORDER;
    return s;
  }, [dayOrders]);

  async function updateStatus(id, estatus) {
    const prevOrders = orders;
    setBusyId(id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estatus } : o)));
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estatus }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estatus.");
    } catch (err) {
      setError(err.message);
      setOrders(prevOrders);
    } finally {
      setBusyId(null);
    }
  }

  async function removeOrder(id) {
    if (!confirm("¿Eliminar este pedido? Esta acción no se puede deshacer.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("No se pudo eliminar el pedido.");
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Consulta el total y el detalle de los pedidos por día.
          </p>
        </div>
        <label className="flex flex-col text-sm font-medium text-slate-600">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {dateCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dateCounts.map(([d, count]) => (
            <button
              key={d}
              type="button"
              onClick={() => setFecha(d)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                d === fecha
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d} · {count}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando pedidos…</p>
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cobro estimado
            </h2>
            <div className="grid grid-cols-1">
              <SummaryCard
                value={`$${summary.totalEstimado}`}
                tone="green"
                icon="💵"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pedidos
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Total" value={summary.total} tone="orange" icon="🧾" />
              <SummaryCard label="Pedidos Empanadas" value={summary.Empanada} icon="🥟" />
              <SummaryCard label="Pedidos Arepas" value={summary.Arepa} icon="🫓" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estatus
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                label="Pendientes"
                value={summary.estatus.Pendiente}
                tone="orange"
                icon="⏳"
              />
              <SummaryCard
                label="Pagados"
                value={summary.estatus.Pagado}
                tone="green"
                icon="✅"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-700">
                Sabores · Empanadas ({summary.unidadesPorComida.Empanada})
              </h2>
              <ul className="space-y-1 text-sm">
                {FLAVORS.map((f) => (
                  <li
                    key={f}
                    className="flex justify-between border-b border-slate-100 py-1 last:border-0"
                  >
                    <span>{f}</span>
                    <span className="font-semibold">
                      {summary.saboresPorComida.Empanada[f]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-700">
                Sabores · Arepas ({summary.unidadesPorComida.Arepa})
              </h2>
              <ul className="space-y-1 text-sm">
                {FLAVORS.map((f) => (
                  <li
                    key={f}
                    className="flex justify-between border-b border-slate-100 py-1 last:border-0"
                  >
                    <span>{f}</span>
                    <span className="font-semibold">
                      {summary.saboresPorComida.Arepa[f]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-700">Estatus</h2>
              <ul className="space-y-1 text-sm">
                {STATUSES.map((st) => (
                  <li
                    key={st}
                    className="flex justify-between border-b border-slate-100 py-1 last:border-0"
                  >
                    <span>{st}</span>
                    <span className="font-semibold">{summary.estatus[st]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-slate-700">
              Detalle de pedidos ({dayOrders.length})
            </h2>
            {dayOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                No hay pedidos para esta fecha.
              </p>
            ) : (
              <div className="space-y-3">
                {dayOrders.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{o.cliente}</p>
                        <p className="text-sm text-slate-500">
                          {o.comida} · {o.sabores.join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={o.estatus}
                          disabled={busyId === o.id}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${STATUS_STYLES[o.estatus]}`}
                        >
                          {STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        {o.estatus === "Pendiente" && (
                          <Link
                            href={`/pedidos/${o.id}/editar`}
                            className="rounded-lg border border-sky-200 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                          >
                            Editar
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => removeOrder(o.id)}
                          disabled={busyId === o.id}
                          className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const CARD_TONE_STYLES = {
  neutral: "border-slate-200 bg-white",
  orange: "border-orange-300 bg-orange-50",
  green: "border-emerald-300 bg-emerald-50",
};

function SummaryCard({ label, value, tone = "neutral", icon }) {
  return (
    <div className={`rounded-xl border p-4 ${CARD_TONE_STYLES[tone]}`}>
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className="text-base" aria-hidden="true">
            {icon}
          </span>
        )}
        {label && <p className="text-xs font-medium text-slate-500">{label}</p>}
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
