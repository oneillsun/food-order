import { COMBO_SIZE, MAX_UNITS_PER_ORDER, FOOD_TYPES, FLAVORS } from "./constants";

// Valida los campos de contenido de un pedido (fecha, cliente, comida,
// sabores). Se usa tanto al crear como al editar un pedido, para que ambos
// caminos respeten las mismas reglas de negocio.
export function validateOrderInput(body) {
  const { fecha, cliente, comida, sabores } = body ?? {};

  if (!fecha || typeof fecha !== "string") {
    return { error: "La fecha es obligatoria." };
  }
  if (!cliente || typeof cliente !== "string" || !cliente.trim()) {
    return { error: "El nombre del cliente es obligatorio." };
  }
  if (!FOOD_TYPES.includes(comida)) {
    return { error: `La comida debe ser una de: ${FOOD_TYPES.join(", ")}.` };
  }

  const minCount = COMBO_SIZE[comida];
  if (
    !Array.isArray(sabores) ||
    sabores.length < minCount ||
    sabores.length > MAX_UNITS_PER_ORDER
  ) {
    return {
      error: `La cantidad de sabores para ${comida} debe ser entre ${minCount} (combo por defecto) y ${MAX_UNITS_PER_ORDER}.`,
    };
  }
  if (sabores.some((s) => !FLAVORS.includes(s))) {
    return { error: `Cada sabor debe ser uno de: ${FLAVORS.join(", ")}.` };
  }

  return { value: { fecha, cliente: cliente.trim(), comida, sabores } };
}
