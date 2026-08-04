// Catálogo de sabores disponibles para empanadas y arepas.
export const FLAVORS = [
  "Molida",
  "Pollo",
  "Queso",
  "Carne con queso",
  "Queso con tocineta",
  "Jamón y queso",
  "Mechada",
];

// Tipos de comida que se pueden pedir.
export const FOOD_TYPES = ["Empanada", "Arepa"];

// Horas de entrega disponibles, en intervalos de 30 min desde las 7:00 am
// hasta las 8:30 pm.
function buildDeliveryTimes() {
  const times = [];
  for (let minutes = 7 * 60; minutes <= 20 * 60 + 30; minutes += 30) {
    const h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const period = h24 < 12 ? "am" : "pm";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    times.push(`${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`);
  }
  return times;
}
export const DELIVERY_TIMES = buildDeliveryTimes();

// Fuentes por las que puede llegar un pedido.
export const SOURCES = ["Contacto directo", "Redes Sociales"];

// Cantidad de unidades que trae cada combo por defecto, según el tipo de comida.
export const COMBO_SIZE = {
  Empanada: 3,
  Arepa: 2,
};

// Tope superior de unidades por pedido, para la excepción de agregar unidades
// extra al combo por defecto (ej. 4 empanadas en vez de 3).
export const MAX_UNITS_PER_ORDER = 20;

// Estados posibles de un pedido, en el orden natural de su ciclo de vida.
export const STATUSES = ["Pendiente", "Pagado"];

// Precio fijo por pedido (combo), usado para estimar el total a cobrar.
export const PRICE_PER_ORDER = 12;

// Tope de copias idénticas que se pueden crear de un mismo pedido nuevo
// en una sola vez (ej. mismo combo para varias personas).
export const MAX_COPIES_PER_SUBMIT = 20;
