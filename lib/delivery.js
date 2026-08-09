// Cálculo del costo de delivery en base a la distancia en línea recta
// (fórmula de Haversine) entre la dirección de origen y la dirección de
// entrega del pedido. Gratis si la entrega es en Florence.

const EARTH_RADIUS_MILES = 3958.8;

// Origen fijo del negocio, geocodificado una sola vez para evitar
// depender de la red en cada cálculo.
export const DELIVERY_ORIGIN = {
  address: "2314 Palmetto Ct, Florence, KY 41042",
  lat: 38.9982962,
  lon: -84.6617155,
};

export const DELIVERY_RATE_PER_MILE = 1;

// La distancia en línea recta subestima la distancia real manejando, así
// que se ajusta con un factor para aproximar la desviación de las calles.
export const ROAD_DISTANCE_FACTOR = 1.2;

export function isFreeDeliveryAddress(direccion) {
  return /florence/i.test(direccion || "");
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_MILES * c;
}

// Geocodifica una dirección usando Nominatim (OpenStreetMap). Requiere un
// User-Agent identificable según su política de uso.
export async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    address
  )}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "food-order-app (delivery-cost-estimate)" },
  });
  if (!res.ok) throw new Error("No se pudo geocodificar la dirección.");
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

// Devuelve { free, distanceMiles, cost } o null si la dirección no se pudo
// ubicar.
export async function calculateDeliveryCost(direccion) {
  if (!direccion) return null;
  if (isFreeDeliveryAddress(direccion)) {
    return { free: true, distanceMiles: 0, cost: 0 };
  }

  const dest = await geocodeAddress(direccion);
  if (!dest) return null;

  const straightLineMiles = haversineMiles(
    DELIVERY_ORIGIN.lat,
    DELIVERY_ORIGIN.lon,
    dest.lat,
    dest.lon
  );
  const distanceMiles = straightLineMiles * ROAD_DISTANCE_FACTOR;
  const cost = Math.round(distanceMiles * DELIVERY_RATE_PER_MILE);

  return { free: false, distanceMiles, cost };
}
