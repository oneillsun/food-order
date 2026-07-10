"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FLAVORS, COMBO_SIZE, MAX_UNITS_PER_ORDER, FOOD_TYPES } from "@/lib/constants";

function todayISO() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function emptyQuantities() {
  return Object.fromEntries(FLAVORS.map((f) => [f, 0]));
}

function quantitiesFromSabores(sabores) {
  const q = emptyQuantities();
  for (const s of sabores) {
    if (q[s] !== undefined) q[s] += 1;
  }
  return q;
}

// Sin `order`, el formulario crea un pedido nuevo (POST). Con `order`, edita
// ese pedido existente (PATCH) — solo se debe montar así mientras esté
// en estatus Pendiente, esa regla la aplica la pantalla que lo invoca.
export default function OrderForm({ order = null }) {
  const router = useRouter();
  const isEditing = Boolean(order);

  const [fecha, setFecha] = useState(order?.fecha ?? todayISO());
  const [cliente, setCliente] = useState(order?.cliente ?? "");
  const [comida, setComida] = useState(order?.comida ?? "Empanada");
  const [unitCount, setUnitCount] = useState(order?.sabores.length ?? COMBO_SIZE.Empanada);
  const [quantities, setQuantities] = useState(
    order ? quantitiesFromSabores(order.sabores) : emptyQuantities()
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const defaultSize = COMBO_SIZE[comida];
  const totalSelected = Object.values(quantities).reduce((a, b) => a + b, 0);
  const isComplete = totalSelected === unitCount;

  function handleComidaChange(value) {
    setComida(value);
    setUnitCount(COMBO_SIZE[value]);
    setQuantities(emptyQuantities());
  }

  function changeUnitCount(delta) {
    const next = Math.min(MAX_UNITS_PER_ORDER, Math.max(defaultSize, unitCount + delta));
    if (next === unitCount) return;
    setUnitCount(next);
    setQuantities(emptyQuantities());
  }

  function increment(flavor) {
    if (totalSelected >= unitCount) return;
    setQuantities((prev) => ({ ...prev, [flavor]: prev[flavor] + 1 }));
  }

  function decrement(flavor) {
    if (quantities[flavor] === 0) return;
    setQuantities((prev) => ({ ...prev, [flavor]: prev[flavor] - 1 }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isComplete) {
      setError(`Selecciona ${unitCount} sabores en total (puedes repetir).`);
      return;
    }

    const sabores = FLAVORS.flatMap((f) => Array(quantities[f]).fill(f));

    setSubmitting(true);
    try {
      const url = isEditing ? `/api/orders/${order.id}` : "/api/orders";
      const method = isEditing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha, cliente, comida, sabores }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar el pedido.");

      if (isEditing) {
        router.push("/");
        router.refresh();
        return;
      }

      setSuccess("¡Pedido guardado!");
      setCliente("");
      setUnitCount(COMBO_SIZE[comida]);
      setQuantities(emptyQuantities());
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h1 className="text-xl font-bold">{isEditing ? "Editar pedido" : "Nuevo pedido"}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col text-sm font-medium text-slate-600">
          Fecha
          <input
            type="date"
            required
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col text-sm font-medium text-slate-600">
          Cliente
          <input
            type="text"
            required
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Nombre del cliente"
            className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <div>
        <span className="text-sm font-medium text-slate-600">Comida</span>
        <div className="mt-1 flex gap-3">
          {FOOD_TYPES.map((f) => (
            <label
              key={f}
              className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors ${
                comida === f
                  ? "border-orange-500 bg-orange-50 text-orange-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="comida"
                value={f}
                checked={comida === f}
                onChange={() => handleComidaChange(f)}
                className="sr-only"
              />
              {f} ({COMBO_SIZE[f]} en el combo)
            </label>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm font-medium text-slate-600">
          Cantidad de unidades{" "}
          <span className="font-normal text-slate-400">
            (por defecto {defaultSize}, se puede aumentar por excepción)
          </span>
        </span>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeUnitCount(-1)}
            disabled={unitCount <= defaultSize}
            aria-label="Quitar unidad"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-6 text-center text-lg font-bold text-slate-800">
            {unitCount}
          </span>
          <button
            type="button"
            onClick={() => changeUnitCount(1)}
            disabled={unitCount >= MAX_UNITS_PER_ORDER}
            aria-label="Agregar unidad"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-orange-400 text-orange-600 transition-colors hover:bg-orange-100 disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div
          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-semibold ${
            isComplete
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-amber-300 bg-amber-50 text-amber-700"
          }`}
        >
          <span>Sabores seleccionados (puedes repetir)</span>
          <span>
            {totalSelected} / {unitCount}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FLAVORS.map((f) => {
            const count = quantities[f];
            return (
              <div
                key={f}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  count > 0
                    ? "border-orange-400 bg-orange-50"
                    : "border-slate-200"
                }`}
              >
                <span className="text-sm font-medium text-slate-700">{f}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => decrement(f)}
                    disabled={count === 0}
                    aria-label={`Quitar ${f}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-4 text-center font-semibold text-slate-800">
                    {count}
                  </span>
                  <button
                    type="button"
                    onClick={() => increment(f)}
                    disabled={totalSelected >= unitCount}
                    aria-label={`Agregar ${f}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-orange-400 text-orange-600 transition-colors hover:bg-orange-100 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}

      <div className="flex gap-3">
        {isEditing && (
          <Link
            href="/"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-center font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </Link>
        )}
        <button
          type="submit"
          disabled={submitting || !isComplete}
          className="flex-1 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
        >
          {submitting
            ? "Guardando…"
            : isEditing
              ? "Guardar cambios"
              : "Guardar pedido"}
        </button>
      </div>
    </form>
  );
}
