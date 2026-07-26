// Capa de datos para los pedidos.
//
// Cada pedido se guarda en su propio archivo (orders/<id>.json) en vez de un
// solo orders.json compartido entre todos. Con un archivo compartido, crear
// un pedido significa "leer todo -> agregar -> escribir todo": si esa lectura
// llega a devolver una versión un poco vieja (por ejemplo porque Vercel Blob
// sirve las lecturas por CDN por defecto), el pedido que faltaba en esa
// lectura se pierde silenciosamente al sobreescribir, aunque el guardado
// anterior sí haya funcionado. Con un archivo por pedido, crear uno nuevo es
// una sola escritura independiente que nunca puede pisar la de otro pedido.
//
// - En Vercel (producción), el sistema de archivos de las funciones serverless
//   es efectivamente de solo lectura y no persiste entre invocaciones, así que
//   usamos Vercel Blob para guardar cada pedido de forma duradera. Los blobs
//   son `access: "public"`, y en la versión actual del SDK la opción
//   `useCache: false` de `get()` solo tiene efecto para blobs privados (es
//   un no-op para públicos), así que un pedido editado podía tardar en
//   reflejarse porque seguíamos leyendo la copia cacheada por el CDN. Para
//   evitarlo, las lecturas hacen `fetch` directo a la URL pública del blob
//   con un parámetro de cache-busting y `cache: "no-store"`, en vez de
//   depender de `get()`.
// - En desarrollo local, si no hay token de Blob configurado, caemos a
//   archivos JSON reales en disco (data/orders/<id>.json).
//
// La detección es automática: si existe BLOB_READ_WRITE_TOKEN (Vercel lo
// inyecta solo cuando conectas un Blob Store al proyecto) se usa Blob; si no,
// se usa el almacenamiento local.
import { list, put, del, head, BlobNotFoundError } from "@vercel/blob";
import fs from "fs/promises";
import path from "path";

const PREFIX = "orders/";
const LOCAL_DIR = path.join(process.cwd(), "data", "orders");

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
// En Vercel el filesystem es de solo lectura: sin Blob configurado, el
// fallback local fallaría de forma confusa. Lo detectamos temprano y damos
// un mensaje claro en vez de un error de escritura genérico.
const runningOnVercelWithoutBlob = Boolean(process.env.VERCEL) && !useBlob;

function assertStorageConfigured() {
  if (runningOnVercelWithoutBlob) {
    throw new Error(
      "Falta conectar Vercel Blob: ve al proyecto en vercel.com → Storage → " +
        "Create Database → Blob, conéctalo a este proyecto y vuelve a desplegar."
    );
  }
}

function blobPath(id) {
  return `${PREFIX}${id}.json`;
}

async function listBlobs() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

// Descarga el contenido de un blob directamente de su URL pública, con un
// parámetro de cache-busting propio (ver nota arriba sobre `useCache`).
async function fetchBlobJson(url) {
  const bustUrl = `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
  const res = await fetch(bustUrl, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`No se pudo leer el pedido (${res.status}).`);
  return res.json();
}

async function getAllFromBlob() {
  const blobs = await listBlobs();
  const orders = await Promise.all(blobs.map((b) => fetchBlobJson(b.url)));
  return orders.filter(Boolean);
}

async function getOneFromBlob(id) {
  let meta;
  try {
    meta = await head(blobPath(id));
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
  return fetchBlobJson(meta.url);
}

async function putOneToBlob(order) {
  await put(blobPath(order.id), JSON.stringify(order), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

async function deleteOneFromBlob(id) {
  await del(blobPath(id));
}

async function getAllFromLocal() {
  try {
    const files = await fs.readdir(LOCAL_DIR);
    return await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => JSON.parse(await fs.readFile(path.join(LOCAL_DIR, f), "utf-8")))
    );
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function getOneFromLocal(id) {
  try {
    const raw = await fs.readFile(path.join(LOCAL_DIR, `${id}.json`), "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

async function putOneToLocal(order) {
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  await fs.writeFile(
    path.join(LOCAL_DIR, `${order.id}.json`),
    JSON.stringify(order, null, 2),
    "utf-8"
  );
}

async function deleteOneFromLocal(id) {
  try {
    await fs.unlink(path.join(LOCAL_DIR, `${id}.json`));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

// Todos los pedidos.
export async function getOrders() {
  assertStorageConfigured();
  return useBlob ? getAllFromBlob() : getAllFromLocal();
}

// Un pedido puntual, o null si no existe.
export async function getOrder(id) {
  assertStorageConfigured();
  return useBlob ? getOneFromBlob(id) : getOneFromLocal(id);
}

// Crea o reemplaza por completo un pedido (identificado por order.id).
export async function putOrder(order) {
  assertStorageConfigured();
  return useBlob ? putOneToBlob(order) : putOneToLocal(order);
}

// Elimina un pedido por id.
export async function deleteOrder(id) {
  assertStorageConfigured();
  return useBlob ? deleteOneFromBlob(id) : deleteOneFromLocal(id);
}
