import { COMBO_SIZE, MAX_UNITS_PER_ORDER, FOOD_TYPES, FLAVORS, SOURCES } from "./constants";

// Formato de EE.UU. (NANP): área y prefijo no pueden empezar en 0 o 1.
const US_PHONE_REGEX = /^\(([2-9]\d{2})\) ([2-9]\d{2})-(\d{4})$/;

// Valida los campos de contenido de un pedido (fecha, cliente, telefono,
// comida, sabores, fuente). Se usa tanto al crear como al editar un pedido,
// para que ambos caminos respeten las mismas reglas de negocio.
export function validateOrderInput(body) {
  const { fecha, cliente, telefono, comida, sabores, fuente = SOURCES[0] } = body ?? {};

  if (!fecha || typeof fecha !== "string") {
    return { error: "La fecha es obligatoria." };
  }
  if (!cliente || typeof cliente !== "string" || !cliente.trim()) {
    return { error: "El nombre del cliente es obligatorio." };
  }
  if (typeof telefono !== "string" || !US_PHONE_REGEX.test(telefono)) {
    return { error: "El teléfono debe tener el formato de EE.UU.: (555) 123-4567." };
  }
  if (!FOOD_TYPES.includes(comida)) {
    return { error: `La comida debe ser una de: ${FOOD_TYPES.join(", ")}.` };
  }
  if (!SOURCES.includes(fuente)) {
    return { error: `La fuente debe ser una de: ${SOURCES.join(", ")}.` };
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

  return { value: { fecha, cliente: cliente.trim(), telefono, comida, sabores, fuente } };
}
