// Catálogo de sabores disponibles para empanadas y arepas.
export const FLAVORS = [
  "Molida",
  "Pollo",
  "Queso",
  "Carne con queso",
  "Queso con tocineta",
];

// Tipos de comida que se pueden pedir.
export const FOOD_TYPES = ["Empanada", "Arepa"];

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
