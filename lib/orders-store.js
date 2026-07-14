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
//   usamos Vercel Blob para guardar cada pedido de forma duradera. Las
//   lecturas usan `useCache: false` para leer siempre el contenido más
//   reciente en vez de una copia en caché del CDN.
// - En desarrollo local, si no hay token de Blob configurado, caemos a
//   archivos JSON reales en disco (data/orders/<id>.json).
//
// La detección es automática: si existe BLOB_READ_WRITE_TOKEN (Vercel lo
// inyecta solo cuando conectas un Blob Store al proyecto) se usa Blob; si no,
// se usa el almacenamiento local.
import { list, put, del, get } from "@vercel/blob";
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

async function listBlobPathnames() {
  const pathnames = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    pathnames.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return pathnames;
}

async function readBlobJson(pathname) {
  const result = await get(pathname, { access: "public", useCache: false });
  if (!result || !result.stream) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

async function getAllFromBlob() {
  const pathnames = await listBlobPathnames();
  const orders = await Promise.all(pathnames.map((p) => readBlobJson(p)));
  return orders.filter(Boolean);
}

async function getOneFromBlob(id) {
  return readBlobJson(blobPath(id));
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
