"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FLAVORS, STATUSES, PRICE_PER_ORDER } from "@/lib/constants";

function currentMonthISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 7);
}

function shiftMonth(mes, delta) {
  const [year, month] = mes.split("-").map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(mes) {
  const [year, month] = mes.split("-").map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString("es", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function ReporteMensual() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mes = searchParams.get("mes") || currentMonthISO();

  function goToMonth(newMes) {
    router.push(`/reportes/mensual?mes=${newMes}`);
  }

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

  const monthOrders = useMemo(
    () => orders.filter((o) => o.fecha.slice(0, 7) === mes),
    [orders, mes]
  );

  const summary = useMemo(() => {
    const s = {
      total: monthOrders.length,
      totalEstimado: monthOrders.length * PRICE_PER_ORDER,
      pedidosPorComida: { Empanada: 0, Arepa: 0 },
      saboresPorComida: {
        Empanada: Object.fromEntries(FLAVORS.map((f) => [f, 0])),
        Arepa: Object.fromEntries(FLAVORS.map((f) => [f, 0])),
      },
      estatus: Object.fromEntries(STATUSES.map((st) => [st, 0])),
    };
    for (const o of monthOrders) {
      s.pedidosPorComida[o.comida] = (s.pedidosPorComida[o.comida] || 0) + 1;
      s.estatus[o.estatus] = (s.estatus[o.estatus] || 0) + 1;
      for (const sabor of o.sabores) {
        s.saboresPorComida[o.comida][sabor] = (s.saboresPorComida[o.comida][sabor] || 0) + 1;
      }
    }
    return s;
  }, [monthOrders]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reporte mensual</h1>
          <p className="text-sm text-slate-500">{formatMonthLabel(mes)}</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToMonth(shiftMonth(mes, -1))}
              aria-label="Mes anterior"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              ‹
            </button>
            <input
              type="month"
              value={mes}
              onChange={(e) => e.target.value && goToMonth(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => goToMonth(shiftMonth(mes, 1))}
              aria-label="Mes siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
            >
              ›
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Link
            href="/reportes/historico"
            className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            Resumen histórico
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
      ) : (
        <>
          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Monto en ventas
            </h2>
            <div className="grid grid-cols-1">
              <SummaryCard value={`$${summary.totalEstimado}`} tone="green" icon="💵" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <ul className="space-y-1 text-sm">
                {STATUSES.map((st) => (
                  <li
                    key={st}
                    className="flex justify-between border-b border-slate-100 py-1 last:border-0"
                  >
                    <span>{st}s</span>
                    <span className="font-semibold">
                      {summary.estatus[st]} (${summary.estatus[st] * PRICE_PER_ORDER})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pedidos
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <SummaryCard label="Total" value={summary.total} tone="orange" icon="🧾" />
              <SummaryCard
                label="Pedidos Empanadas"
                value={summary.pedidosPorComida.Empanada}
                icon="🥟"
              />
              <SummaryCard
                label="Pedidos Arepas"
                value={summary.pedidosPorComida.Arepa}
                icon="🫓"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold text-slate-700">
                Total · Empanadas (
                {Object.values(summary.saboresPorComida.Empanada).reduce((a, b) => a + b, 0)})
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
                Total · Arepas (
                {Object.values(summary.saboresPorComida.Arepa).reduce((a, b) => a + b, 0)})
              </h2>
              <ul className="space-y-1 text-sm">
                {FLAVORS.map((f) => (
                  <li
                    key={f}
                    className="flex justify-between border-b border-slate-100 py-1 last:border-0"
                  >
                    <span>{f}</span>
                    <span className="font-semibold">{summary.saboresPorComida.Arepa[f]}</span>
                  </li>
                ))}
              </ul>
            </div>
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
