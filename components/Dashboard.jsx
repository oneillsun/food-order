"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FLAVORS, STATUSES, PRICE_PER_ORDER } from "@/lib/constants";
import { takePendingOrderUpdate } from "@/lib/order-update-bus";

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  Pendiente: "border-amber-300 bg-amber-100 text-amber-800",
  Pagado: "border-emerald-300 bg-emerald-100 text-emerald-800",
};

// Link de WhatsApp a partir de un teléfono de EE.UU.; null si no hay teléfono
// (pedidos creados antes de agregar este campo).
function whatsappLink(telefono) {
  const digits = (telefono || "").replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/1${digits}`;
}

// Link a Apple Maps a partir de la dirección de entrega; null si no hay
// dirección. Abre la app de navegación instalada en dispositivos móviles.
function mapLink(direccion) {
  if (!direccion) return null;
  return `https://maps.apple.com/?q=${encodeURIComponent(direccion)}`;
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [fecha, setFecha] = useState(todayISO());
  const [statusFilter, setStatusFilter] = useState("Todos");
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

      // Vercel Blob puede tardar en propagar la sobreescritura de un pedido
      // editado, así que este fetch a veces devuelve todavía la versión
      // vieja. Si venimos de editar un pedido, aplicamos encima la versión
      // que ya sabemos correcta (la que devolvió el PATCH) en vez de
      // esperar a que Blob se ponga al día.
      let orders = data.orders;
      const pending = takePendingOrderUpdate();
      if (pending) {
        const idx = orders.findIndex((o) => o.id === pending.id);
        orders =
          idx === -1
            ? [pending, ...orders]
            : orders.map((o) => (o.id === pending.id ? pending : o));
      }
      setOrders(orders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    window.addEventListener("refresh-orders", loadAll);
    return () => window.removeEventListener("refresh-orders", loadAll);
  }, []);

  const dateCounts = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const entry = map.get(o.fecha) || { count: 0, hasPendiente: false };
      entry.count += 1;
      if (o.estatus === "Pendiente") entry.hasPendiente = true;
      map.set(o.fecha, entry);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14);
  }, [orders]);

  const dayOrders = useMemo(
    () =>
      orders
        .filter((o) => o.fecha === fecha)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [orders, fecha]
  );

  const detailOrders = useMemo(
    () =>
      statusFilter === "Todos"
        ? dayOrders
        : dayOrders.filter((o) => o.estatus === statusFilter),
    [dayOrders, statusFilter]
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
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col text-sm font-medium text-slate-600">
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <Link
            href={`/reportes/mensual?mes=${fecha.slice(0, 7)}`}
            className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            Reporte mensual
          </Link>
          <Link
            href="/reportes/pendientes"
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            Pedidos pendientes
          </Link>
        </div>
      </div>

      {dateCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dateCounts.map(([d, { count, hasPendiente }]) => (
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
              {hasPendiente && (
                <span aria-label="Tiene pedidos pendientes" title="Tiene pedidos pendientes">
                  ⚠️{" "}
                </span>
              )}
              {d} ({count})
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
              Venta $
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
                label={`Pendientes - $${summary.estatus.Pendiente * PRICE_PER_ORDER}`}
                value={summary.estatus.Pendiente}
                tone="orange"
                icon="⏳"
              />
              <SummaryCard
                label={`Pagados - $${summary.estatus.Pagado * PRICE_PER_ORDER}`}
                value={summary.estatus.Pagado}
                tone="green"
                icon="✅"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-700">
                Total · Empanadas ({summary.unidadesPorComida.Empanada})
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
                Total · Arepas ({summary.unidadesPorComida.Arepa})
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
              <StatusDonutChart estatus={summary.estatus} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-700">
                Detalle de pedidos ({detailOrders.length})
              </h2>
              <div className="flex gap-2">
                {["Todos", ...STATUSES].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      st === statusFilter
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
            {detailOrders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                {dayOrders.length === 0
                  ? "No hay pedidos para esta fecha."
                  : "No hay pedidos con este estatus para esta fecha."}
              </p>
            ) : (
              <div className="space-y-3">
                {detailOrders.map((o) => {
                  const wa = whatsappLink(o.telefono);
                  const maps = mapLink(o.direccion);
                  return (
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
                        {(o.direccion || o.horaEntrega) && (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {o.horaEntrega && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                                <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                                  <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 10.586V6h-2v7a1 1 0 00.293.707l3 3 1.414-1.414-2.707-2.707z" />
                                </svg>
                                {o.horaEntrega}
                              </span>
                            )}
                            {o.direccion && (
                              <span className="text-xs text-slate-400">{o.direccion}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Escribir a ${o.cliente} por WhatsApp`}
                            title="Escribir por WhatsApp"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                              <path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.986.577 3.838 1.573 5.396L2 22l4.735-1.541A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12.001 2zm0 18.083a8.06 8.06 0 01-4.109-1.126l-.295-.175-3.055.995.998-3.008-.192-.309A8.05 8.05 0 013.918 12c0-4.462 3.62-8.083 8.083-8.083 4.462 0 8.083 3.62 8.083 8.083 0 4.462-3.62 8.083-8.083 8.083z" />
                            </svg>
                          </a>
                        )}
                        {maps && (
                          <a
                            href={maps}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir dirección de ${o.cliente} en el mapa`}
                            title="Abrir en el mapa"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                              <path d="M12 2C7.589 2 4 5.589 4 9.995 4 16.44 11.16 21.54 11.464 21.754a.998.998 0 001.072 0C12.84 21.54 20 16.44 20 9.995 20 5.589 16.411 2 12 2zm0 10.5A2.5 2.5 0 1112 7.5a2.5 2.5 0 010 5z" />
                            </svg>
                          </a>
                        )}
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
                  );
                })}
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

// Colores reservados de estatus, iguales a los usados en el resto del
// dashboard (tarjetas y selector de estatus): ámbar para Pendiente, verde
// para Pagado. Nunca se ciclan ni se reutilizan para otra cosa.
const STATUS_CHART_COLORS = {
  Pendiente: "#f59e0b",
  Pagado: "#10b981",
};

function StatusDonutChart({ estatus }) {
  const radius = 42;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const total = STATUSES.reduce((sum, st) => sum + estatus[st], 0);

  let offset = 0;
  const arcs = STATUSES.map((st) => {
    const count = estatus[st];
    const fraction = total > 0 ? count / total : 0;
    const length = fraction * circumference;
    const arc = { st, count, fraction, length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg
        width="120"
        height="120"
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Distribución de pedidos por estatus: ${STATUSES.map(
          (st) => `${st} ${estatus[st]}`
        ).join(", ")}`}
      >
        <g transform="rotate(-90 50 50)">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          {arcs.map(
            (a) =>
              a.length > 0 && (
                <circle
                  key={a.st}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={STATUS_CHART_COLORS[a.st]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${a.length} ${circumference - a.length}`}
                  strokeDashoffset={-a.offset}
                >
                  <title>
                    {a.st}: {a.count} ({Math.round(a.fraction * 100)}%)
                  </title>
                </circle>
              )
          )}
        </g>
        <text
          x="50"
          y="47"
          textAnchor="middle"
          className="fill-slate-800 font-bold"
          style={{ fontSize: "20px" }}
        >
          {total}
        </text>
        <text x="50" y="61" textAnchor="middle" className="fill-slate-500" style={{ fontSize: "8px" }}>
          pedidos
        </text>
      </svg>

      <ul className="w-full max-w-[220px] space-y-2 text-sm">
        {arcs.map((a) => (
          <li key={a.st} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-700">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_CHART_COLORS[a.st] }}
                aria-hidden="true"
              />
              {a.st}s
            </span>
            <span className="text-right">
              <span className="block font-semibold text-slate-800">
                {a.count} ({total > 0 ? Math.round(a.fraction * 100) : 0}%)
              </span>
              <span className="block text-xs text-slate-500">
                ${a.count * PRICE_PER_ORDER}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
