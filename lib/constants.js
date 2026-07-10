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

// Cantidad de unidades que trae cada combo, según el tipo de comida.
export const COMBO_SIZE = {
  Empanada: 3,
  Arepa: 2,
};

// Estados posibles de un pedido, en el orden natural de su ciclo de vida.
export const STATUSES = ["Pendiente", "Pagado"];
