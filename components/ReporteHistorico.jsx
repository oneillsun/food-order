"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PRICE_PER_ORDER } from "@/lib/constants";

function formatMonthLabel(mes) {
  const [year, month] = mes.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("es", {
    month: "short",
    year: "2-digit",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ReporteHistorico() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const monthly = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const mes = o.fecha.slice(0, 7);
      map.set(mes, (map.get(mes) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, total]) => ({ mes, total }));
  }, [orders]);

  const totals = useMemo(
    () => ({
      pedidos: orders.length,
      estimado: orders.length * PRICE_PER_ORDER,
    }),
    [orders]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Resumen histórico</h1>
          <p className="text-sm text-slate-500">Pedidos por mes, desde el inicio.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Link
            href="/reportes/mensual"
            className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            Reporte mensual
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando reporte…</p>
      ) : monthly.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Todavía no hay pedidos registrados.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              label="Pedidos totales"
              value={totals.pedidos}
              tone="orange"
              icon="🧾"
            />
            <SummaryCard
              label="Venta total estimada"
              value={`$${totals.estimado}`}
              tone="green"
              icon="💵"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-4 font-semibold text-slate-700">Pedidos por mes</h2>
            <MonthlyBarChart data={monthly} />
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

// Naranja consistente con el resto del dashboard (botones y tarjetas "Pedidos").
const BAR_COLOR = "#f97316";
const CHART_HEIGHT = 160;

function MonthlyBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="overflow-x-auto">
      <div
        className="flex items-end gap-3"
        style={{ minWidth: `${data.length * 56}px`, height: `${CHART_HEIGHT + 48}px` }}
      >
        {data.map((d) => {
          const barHeight = Math.max(Math.round((d.total / max) * CHART_HEIGHT), 4);
          return (
            <Link
              key={d.mes}
              href={`/reportes/mensual?mes=${d.mes}`}
              className="group flex flex-1 flex-col items-center justify-end"
              title={`${formatMonthLabel(d.mes)}: ${d.total} pedidos`}
            >
              <span className="mb-1 text-xs font-semibold text-slate-700">{d.total}</span>
              <div
                className="w-full max-w-[28px] rounded-t transition-opacity group-hover:opacity-80"
                style={{ height: `${barHeight}px`, backgroundColor: BAR_COLOR }}
              />
              <span className="mt-2 whitespace-nowrap text-xs text-slate-500 group-hover:text-orange-700">
                {formatMonthLabel(d.mes)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
